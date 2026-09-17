import io
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database.database import Base, get_db
from backend.app.main import app
from backend.app.database.models import Job, JobImage
from backend.app.database.repositories import JobRepository
from backend.app.jobs.states import JobStatus
from backend.app.publishing.base import PublishingProvider, PublishingResult
import backend.app.api.jobs as jobs_api_module

# Isolated test DB
test_engine = create_engine(
    "sqlite:///:memory:",
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


def seed_ready_job(job_id: str = "job_ready_100") -> Job:
    db = TestingSessionLocal()
    try:
        job = JobRepository.create_job(
            db=db,
            job_id=job_id,
            fingerprint=f"fp_{job_id}",
            caption="Test Caption",
            hashtags="#test",
            final_caption="Test Caption\n\n#test",
            image_count=2,
            status=JobStatus.READY.value,
        )
        JobRepository.add_job_image(
            db=db,
            job_id=job_id,
            order_index=1,
            original_filename="1.jpg",
            original_width=1080,
            original_height=1920,
            processed_width=1080,
            processed_height=1920,
            storage_key=f"instagram/jobs/{job_id}/001.jpg",
            public_url=f"https://storage.supabase.co/{job_id}/001.jpg",
        )
        JobRepository.add_job_image(
            db=db,
            job_id=job_id,
            order_index=2,
            original_filename="2.jpg",
            original_width=1080,
            original_height=1920,
            processed_width=1080,
            processed_height=1920,
            storage_key=f"instagram/jobs/{job_id}/002.jpg",
            public_url=f"https://storage.supabase.co/{job_id}/002.jpg",
        )
        return job
    finally:
        db.close()


class MockSuccessPublisher(PublishingProvider):
    def publish_carousel(self, job: Job) -> PublishingResult:
        return PublishingResult(
            success=True,
            job_id=job.job_id,
            instagram_post_id="ig_carousel_post_7777",
            make_execution_id="make_run_555",
            make_status="PUBLISHED",
        )


class MockFailingPublisher(PublishingProvider):
    def publish_carousel(self, job: Job) -> PublishingResult:
        return PublishingResult(
            success=False,
            job_id=job.job_id,
            error_message="Instagram API error: Access token expired.",
        )


def test_publish_endpoint_success():
    job_id = "job_pub_success_1"
    seed_ready_job(job_id)

    # Monkeypatch publisher to guaranteed mock success
    orig_factory = jobs_api_module.get_publishing_provider
    jobs_api_module.get_publishing_provider = lambda: MockSuccessPublisher()

    try:
        response = client.post(f"/api/jobs/{job_id}/publish")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "PUBLISHED"
        assert data["instagram_post_id"] == "ig_carousel_post_7777"
        assert data["make_execution_id"] == "make_run_555"
        assert data["published_at"] is not None

        # Verify database was updated
        db = TestingSessionLocal()
        saved = JobRepository.get_job_by_id(db, job_id)
        assert saved.status == "PUBLISHED"
        assert saved.instagram_post_id == "ig_carousel_post_7777"
        db.close()
    finally:
        jobs_api_module.get_publishing_provider = orig_factory


def test_publish_endpoint_idempotent_when_already_published():
    job_id = "job_pub_already_done"
    seed_ready_job(job_id)

    # Mark as published
    db = TestingSessionLocal()
    JobRepository.update_job_status(db, job_id, "PUBLISHED", instagram_post_id="ig_prev_post")
    db.close()

    response = client.post(f"/api/jobs/{job_id}/publish")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PUBLISHED"
    assert data["instagram_post_id"] == "ig_prev_post"
    assert "already published" in data["message"].lower()


def test_publish_endpoint_rejects_unready_job():
    job_id = "job_unready"
    db = TestingSessionLocal()
    JobRepository.create_job(db, job_id, "fp_unready", status="RECEIVED")
    db.close()

    response = client.post(f"/api/jobs/{job_id}/publish")
    assert response.status_code == 400
    assert "READY" in response.json()["detail"]


def test_publish_endpoint_handles_publishing_failure():
    job_id = "job_pub_fail"
    seed_ready_job(job_id)

    orig_factory = jobs_api_module.get_publishing_provider
    jobs_api_module.get_publishing_provider = lambda: MockFailingPublisher()

    try:
        response = client.post(f"/api/jobs/{job_id}/publish")
        assert response.status_code == 502
        assert "Access token expired" in response.json()["detail"]

        # Verify job is marked FAILED in DB
        db = TestingSessionLocal()
        saved = JobRepository.get_job_by_id(db, job_id)
        assert saved.status == "FAILED"
        assert "Access token expired" in saved.error_message
        db.close()
    finally:
        jobs_api_module.get_publishing_provider = orig_factory
