import io
import json
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database.database import Base, get_db
from backend.app.main import app
from backend.app.jobs.fingerprint import compute_submission_fingerprint
from backend.app.jobs.manager import JobManager
from backend.app.jobs.states import JobStatus
from backend.app.database.repositories import JobRepository

# In-memory SQLite database for test isolation
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def make_test_image(w: int, h: int, color=(100, 150, 200)) -> bytes:
    img = Image.new("RGB", (w, h), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# --- 1. Fingerprint Unit Tests ---

def test_fingerprint_deterministic_and_unique():
    img1 = make_test_image(500, 500, (255, 0, 0))
    img2 = make_test_image(500, 500, (0, 255, 0))

    fp1 = compute_submission_fingerprint([img1, img2], "Caption text", "#hash1 #hash2")
    fp2 = compute_submission_fingerprint([img1, img2], "Caption text", "#hash1 #hash2")
    assert fp1 == fp2  # Deterministic

    # Reordered images produce different fingerprint
    fp_reordered = compute_submission_fingerprint([img2, img1], "Caption text", "#hash1 #hash2")
    assert fp1 != fp_reordered

    # Modified caption produces different fingerprint
    fp_diff_caption = compute_submission_fingerprint([img1, img2], "Different caption", "#hash1 #hash2")
    assert fp1 != fp_diff_caption

    # Different accounts produce different fingerprints
    fp_acc2 = compute_submission_fingerprint([img1, img2], "Caption text", "#hash1 #hash2", account_id="account_2")
    assert fp1 != fp_acc2


# --- 2. JobManager Orchestration Pipeline ---

def test_job_manager_success_flow():
    db = TestingSessionLocal()
    try:
        img1 = make_test_image(1080, 1920)
        img2 = make_test_image(1000, 1000)

        files = [
            ("slide1.jpg", img1, 1),
            ("slide2.jpg", img2, 2),
        ]

        job, is_dup = JobManager.create_and_process_job(
            db=db,
            files=files,
            caption="Hello Carousel",
            hashtags="#testing",
        )

        assert is_dup is False
        assert job.status == JobStatus.READY.value
        assert job.image_count == 2
        assert len(job.images) == 2
        assert job.images[0].order_index == 1
        assert job.images[1].order_index == 2
        assert job.images[0].processed_width == 1080
        assert job.images[0].processed_height == 1920
        assert job.images[1].processed_width == 1080
        assert job.images[1].processed_height == 1920
    finally:
        db.close()


def test_job_manager_duplicate_protection():
    db = TestingSessionLocal()
    try:
        img1 = make_test_image(1080, 1920, (10, 20, 30))
        img2 = make_test_image(1080, 1920, (40, 50, 60))

        files = [
            ("slide1.jpg", img1, 1),
            ("slide2.jpg", img2, 2),
        ]

        job1, is_dup1 = JobManager.create_and_process_job(
            db=db,
            files=files,
            caption="Duplicate Test",
            hashtags="#dup",
        )
        assert is_dup1 is False
        assert job1.status == JobStatus.READY.value

        # Simulate job1 was PUBLISHED to Instagram
        JobRepository.update_job_status(
            db=db,
            job_id=job1.job_id,
            status=JobStatus.PUBLISHED.value,
            instagram_post_id="ig_post_9999",
        )

        # Attempt to submit identical carousel again
        job2, is_dup2 = JobManager.create_and_process_job(
            db=db,
            files=files,
            caption="Duplicate Test",
            hashtags="#dup",
        )
        assert is_dup2 is True
        assert job2.job_id == job1.job_id
        assert job2.instagram_post_id == "ig_post_9999"
    finally:
        db.close()


def test_job_manager_corrupt_image_fails_job():
    db = TestingSessionLocal()
    try:
        img1 = make_test_image(1080, 1920)
        corrupt_bytes = b"BAD_CORRUPT_BYTES"

        files = [
            ("slide1.jpg", img1, 1),
            ("corrupt.jpg", corrupt_bytes, 2),
        ]

        job, is_dup = JobManager.create_and_process_job(
            db=db,
            files=files,
            caption="Bad submission",
        )
        assert is_dup is False
        assert job.status == JobStatus.FAILED.value
        assert "Validation failed" in job.error_message
    finally:
        db.close()


# --- 3. API Endpoints ---

def test_api_jobs_create_and_get():
    img1 = make_test_image(1080, 1920, (12, 34, 56))
    img2 = make_test_image(1080, 1920, (78, 90, 12))

    files = [
        ("files", ("image_1.jpg", img1, "image/jpeg")),
        ("files", ("image_2.jpg", img2, "image/jpeg")),
    ]
    data = {
        "caption": "Testing API",
        "hashtags": "#api #test",
        "order_indices": json.dumps([1, 2]),
    }

    response = client.post("/api/jobs", files=files, data=data)
    assert response.status_code == 200
    res = response.json()

    job_id = res["job_id"]
    assert res["status"] == "READY"
    assert res["account_id"] == "account_1"
    assert res["image_count"] == 2
    assert len(res["images"]) == 2
    assert res["images"][0]["order_index"] == 1
    assert res["images"][1]["order_index"] == 2

    # Verify GET /api/jobs/{job_id}
    get_res = client.get(f"/api/jobs/{job_id}")
    assert get_res.status_code == 200
    job_detail = get_res.json()
    assert job_detail["job_id"] == job_id
    assert job_detail["status"] == "READY"
    assert job_detail["account_id"] == "account_1"

    # Verify GET /api/jobs
    list_res = client.get("/api/jobs")
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(j["job_id"] == job_id for j in items)


def test_api_accounts_list():
    response = client.get("/api/accounts")
    assert response.status_code == 200
    accounts = response.json()
    assert len(accounts) == 3
    ids = [a["id"] for a in accounts]
    assert "account_1" in ids
    assert "account_2" in ids
    assert any(a["handle"] == "@nature.art" for a in accounts)
    assert any(a["handle"] == "@framesofnature" for a in accounts)
    assert any(a["handle"] == "@framesofmovies" for a in accounts)
