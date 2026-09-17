import uuid
import logging
from backend.app.database.models import Job
from backend.app.publishing.base import PublishingProvider, PublishingResult

logger = logging.getLogger("hermes.publishing.mock")


class MockPublisher(PublishingProvider):
    """
    Mock publisher for offline development and initial verification tests (Section 45 Test 9).
    Confirms receipt and returns mock Instagram Post ID without external network requests.
    """

    def publish_carousel(self, job: Job) -> PublishingResult:
        mock_post_id = f"ig_test_{uuid.uuid4().hex[:10]}"
        mock_exec_id = f"make_exec_{uuid.uuid4().hex[:8]}"

        logger.info(f"[MOCK PUBLISH] Dispatched job {job.job_id} -> Generated Post ID: {mock_post_id}")
        return PublishingResult(
            success=True,
            job_id=job.job_id,
            instagram_post_id=mock_post_id,
            make_execution_id=mock_exec_id,
            make_status="PUBLISHED",
            raw_response={
                "status": "published",
                "mock": True,
                "instagram_post_id": mock_post_id,
                "message": "Mock publishing confirmed receipt.",
            },
        )
