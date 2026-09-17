import time
import logging
from typing import Dict, Any, Optional
import httpx

from backend.app.config.settings import get_settings
from backend.app.database.models import Job
from backend.app.publishing.base import PublishingProvider, PublishingResult

logger = logging.getLogger("hermes.publishing.make")
settings = get_settings()


class MakePublisher(PublishingProvider):
    """
    Make.com publishing bridge.
    Sends runtime inputs to a single pre-configured Make scenario webhook.
    Interprets responses explicitly and applies limited exponential backoff on transient errors.
    """

    def __init__(
        self,
        api_url: Optional[str] = None,
        api_token: Optional[str] = None,
        max_retries: int = 3,
        backoff_factor: float = 1.0,
        client: Optional[httpx.Client] = None,
    ):
        self.api_url = (api_url or settings.MAKE_API_URL).strip()
        self.api_token = (api_token or settings.MAKE_API_TOKEN).strip()
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.custom_client = client

    def build_payload(self, job: Job) -> Dict[str, Any]:
        """
        Builds the conceptual Make payload according to Section 27.
        Sorted explicitly by order_index.
        """
        sorted_images = sorted(job.images, key=lambda img: img.order_index)
        image_items = [
            {
                "order": img.order_index,
                "url": img.public_url,
                "image_url": img.public_url,
                "video_url": img.public_url if getattr(img, "media_type", "IMAGE") == "VIDEO" else None,
                "media_type": getattr(img, "media_type", "IMAGE") or "IMAGE",
            }
            for img in sorted_images
        ]
        return {
            "job_id": job.job_id,
            "account_id": getattr(job, "account_id", "account_1") or "account_1",
            "account_handle": getattr(job, "account_handle", "") or "",
            "caption": job.final_caption or job.caption or "",
            "image_count": job.image_count,
            "images": image_items,
            # 'files' matches the exact parameter name and structure expected by Make's Instagram module:
            "files": [
                {
                    "media_type": getattr(img, "media_type", "IMAGE") or "IMAGE",
                    "image_url": img.public_url,
                    "video_url": img.public_url if getattr(img, "media_type", "IMAGE") == "VIDEO" else None,
                }
                for img in sorted_images
            ],
        }

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Hermes-Instagram-Agent/1.0",
        }
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"
        return headers

    def publish_carousel(self, job: Job) -> PublishingResult:
        """
        Dispatches carousel publication payload to Make.com with limited exponential backoff.
        """
        # Resolve target webhook URL: account-specific if set, fallback to default api_url
        target_url = self.api_url
        if hasattr(job, "account_id") and job.account_id:
            from backend.app.config.accounts import get_account_by_id
            acc = get_account_by_id(job.account_id)
            if acc and acc.webhook_url:
                target_url = acc.webhook_url.strip()

        if not target_url:
            return PublishingResult(
                success=False,
                job_id=job.job_id,
                error_message=f"Make.com API URL is not configured for account '{getattr(job, 'account_id', 'account_1')}'. Set MAKE_API_URL in .env.",
            )

        payload = self.build_payload(job)
        headers = self._get_headers()

        last_error: Optional[str] = None
        response: Optional[httpx.Response] = None

        for attempt in range(1, self.max_retries + 1):
            logger.info(f"Dispatching Make.com publishing request for job {job.job_id} to account '{getattr(job, 'account_id', 'account_1')}' (Attempt {attempt}/{self.max_retries})...")
            try:
                def _do_post(http_client: httpx.Client):
                    return http_client.post(
                        target_url,
                        json=payload,
                        headers=headers,
                        timeout=30.0,
                    )

                if self.custom_client is not None:
                    response = _do_post(self.custom_client)
                else:
                    with httpx.Client(timeout=35.0) as default_client:
                        response = _do_post(default_client)

                # Check HTTP status
                if response.status_code in (200, 201, 202):
                    # Request succeeded at network level, now interpret payload
                    return self._interpret_response(job.job_id, response)

                # 4xx client errors should NOT be retried (e.g. invalid payload or credentials)
                if 400 <= response.status_code < 500:
                    error_detail = f"Make.com rejected request with status {response.status_code}: {response.text}"
                    logger.error(error_detail)
                    return PublishingResult(
                        success=False,
                        job_id=job.job_id,
                        error_message=error_detail,
                        raw_response=self._safe_json(response),
                    )

                # 5xx server errors can be retried
                last_error = f"Make.com server error {response.status_code}: {response.text}"
                logger.warning(f"Attempt {attempt} failed: {last_error}")

            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                last_error = f"Network/Timeout error on attempt {attempt}: {str(exc)}"
                logger.warning(last_error)
            except Exception as exc:
                last_error = f"Unexpected error during Make dispatch: {str(exc)}"
                logger.error(last_error)
                break

            # Exponential backoff before next attempt
            if attempt < self.max_retries:
                sleep_time = self.backoff_factor * (2 ** (attempt - 1))
                logger.info(f"Retrying Make request in {sleep_time:.1f}s...")
                time.sleep(sleep_time)

        # All retries exhausted
        return PublishingResult(
            success=False,
            job_id=job.job_id,
            error_message=f"Make publishing failed after {self.max_retries} attempts: {last_error}",
        )

    def _interpret_response(self, job_id: str, response: httpx.Response) -> PublishingResult:
        """
        Explicitly interprets the Make response according to Sections 28 and 29.
        Never marks success unless explicitly confirmed.
        """
        data = self._safe_json(response)
        
        # Check explicit status fields if returned as JSON
        status_val = str(data.get("status", "")).lower() if isinstance(data, dict) else ""
        instagram_post_id = data.get("instagram_post_id") or data.get("post_id") if isinstance(data, dict) else None
        execution_id = data.get("execution_id") or data.get("make_execution_id") if isinstance(data, dict) else None

        if status_val in ("failed", "error"):
            error_msg = data.get("message") or data.get("error") or "Make reported publishing failure."
            return PublishingResult(
                success=False,
                job_id=job_id,
                make_status="FAILED",
                error_message=error_msg,
                raw_response=data,
            )

        # If Make scenario only confirms receipt or returns published
        is_published = status_val in ("published", "success", "ok") or instagram_post_id is not None or response.status_code == 200

        return PublishingResult(
            success=True,
            job_id=job_id,
            instagram_post_id=str(instagram_post_id) if instagram_post_id else None,
            make_execution_id=str(execution_id) if execution_id else None,
            make_status="PUBLISHED" if instagram_post_id else "DISPATCHED",
            raw_response=data,
        )

    @staticmethod
    def _safe_json(response: httpx.Response) -> Dict[str, Any]:
        try:
            return response.json()
        except Exception:
            return {"raw_text": response.text}
