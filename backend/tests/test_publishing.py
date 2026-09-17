import httpx
from backend.app.database.models import Job, JobImage
from backend.app.publishing.make import MakePublisher
from backend.app.publishing.mock import MockPublisher


def make_dummy_job() -> Job:
    job = Job(
        job_id="job_test_123",
        caption="Exploring the mountains.",
        hashtags="#nature #mountains",
        final_caption="Exploring the mountains.\n\n#nature #mountains",
        image_count=2,
        status="READY",
    )
    img1 = JobImage(
        job_id=job.job_id,
        order_index=1,
        original_filename="img1.jpg",
        storage_key="instagram/jobs/job_test_123/001.jpg",
        public_url="https://storage.supabase.co/001.jpg",
    )
    img2 = JobImage(
        job_id=job.job_id,
        order_index=2,
        original_filename="img2.jpg",
        storage_key="instagram/jobs/job_test_123/002.jpg",
        public_url="https://storage.supabase.co/002.jpg",
    )
    job.images = [img2, img1]  # Out of order to test sorting
    return job


# --- 1. Payload Formatting ---

def test_make_payload_building():
    job = make_dummy_job()
    publisher = MakePublisher(api_url="https://hook.make.com/test")
    payload = publisher.build_payload(job)

    assert payload["job_id"] == "job_test_123"
    assert payload["caption"] == "Exploring the mountains.\n\n#nature #mountains"
    assert payload["image_count"] == 2
    assert len(payload["images"]) == 2

    # Verifies sorted order
    assert payload["images"][0]["order"] == 1
    assert payload["images"][0]["url"] == "https://storage.supabase.co/001.jpg"
    assert payload["images"][1]["order"] == 2
    assert payload["images"][1]["url"] == "https://storage.supabase.co/002.jpg"


# --- 2. Response Interpretation ---

def test_make_publish_success_with_post_id():
    job = make_dummy_job()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["User-Agent"] == "Hermes-Instagram-Agent/1.0"
        return httpx.Response(
            200,
            json={
                "status": "published",
                "instagram_post_id": "ig_1849204810293",
                "execution_id": "exec_987",
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    publisher = MakePublisher(
        api_url="https://hook.make.com/test",
        client=client,
    )

    result = publisher.publish_carousel(job)
    assert result.success is True
    assert result.instagram_post_id == "ig_1849204810293"
    assert result.make_execution_id == "exec_987"
    assert result.error_message is None


def test_make_publish_failure_response():
    job = make_dummy_job()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "status": "failed",
                "message": "Instagram token expired or permission missing.",
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    publisher = MakePublisher(
        api_url="https://hook.make.com/test",
        client=client,
    )

    result = publisher.publish_carousel(job)
    assert result.success is False
    assert result.instagram_post_id is None
    assert "token expired" in result.error_message


def test_make_publish_4xx_client_error_no_retry():
    job = make_dummy_job()
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        return httpx.Response(401, text="Unauthorized webhook call")

    client = httpx.Client(transport=httpx.MockTransport(handler))
    publisher = MakePublisher(
        api_url="https://hook.make.com/test",
        max_retries=3,
        backoff_factor=0.01,
        client=client,
    )

    result = publisher.publish_carousel(job)
    assert result.success is False
    assert attempts == 1  # 4xx must not be retried!
    assert "401" in result.error_message


def test_make_publish_retries_transient_500_then_succeeds():
    job = make_dummy_job()
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(502, text="Bad Gateway")
        return httpx.Response(200, json={"status": "published", "instagram_post_id": "ig_success_attempt_2"})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    publisher = MakePublisher(
        api_url="https://hook.make.com/test",
        max_retries=3,
        backoff_factor=0.01,
        client=client,
    )

    result = publisher.publish_carousel(job)
    assert result.success is True
    assert attempts == 2
    assert result.instagram_post_id == "ig_success_attempt_2"


# --- 3. Mock Publisher ---

def test_mock_publisher():
    job = make_dummy_job()
    mock_pub = MockPublisher()
    result = mock_pub.publish_carousel(job)

    assert result.success is True
    assert result.instagram_post_id.startswith("ig_test_")
    assert result.make_status == "PUBLISHED"
