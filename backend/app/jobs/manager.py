import uuid
import logging
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session

from backend.app.database.models import Job, JobImage
from backend.app.database.repositories import JobRepository
from backend.app.jobs.states import JobStatus
from backend.app.jobs.fingerprint import compute_submission_fingerprint, normalize_text
from backend.app.images.validator import ImageValidator
from backend.app.images.processor import ImageProcessor
from backend.app.images.video_processor import VideoProcessor
from backend.app.images.ordering import OrderedImageItem, validate_carousel_order
from backend.app.storage.factory import get_storage_provider
from backend.app.storage.base import StorageProvider
from backend.app.validation.urls import verify_image_url_accessibility
from backend.app.config.accounts import get_account_by_id

logger = logging.getLogger("hermes.jobs.manager")


class JobManager:
    """
    Hermes Job Orchestrator:
    Manages the lifecycle of an Instagram Carousel publishing job:
    RECEIVED -> VALIDATING -> PROCESSING -> UPLOADING -> VERIFYING_URLS -> READY
    """

    @staticmethod
    def construct_final_caption(caption: Optional[str], hashtags: Optional[str]) -> str:
        """Section 20: Merges caption and hashtags cleanly."""
        parts = []
        if caption and caption.strip():
            parts.append(caption.strip())
        if hashtags and hashtags.strip():
            parts.append(hashtags.strip())
        return "\n\n".join(parts)

    @classmethod
    def create_and_process_job(
        cls,
        db: Session,
        files: List[Tuple[str, bytes, int]],  # (filename, raw_bytes, order_index)
        caption: Optional[str] = None,
        hashtags: Optional[str] = None,
        account_id: str = "account_1",
        media_edits: Optional[List[dict]] = None,
    ) -> Tuple[Job, bool]:
        """
        Creates and processes a new carousel job for the target Instagram account.
        
        Returns:
            (Job, is_duplicate: bool)
        """
        # Resolve target account
        account = get_account_by_id(account_id)
        account_handle = account.handle if account else "@unknown"

        # Sort files explicitly by order_index (1-indexed)
        sorted_files = sorted(files, key=lambda x: x[2])
        raw_bytes_list = [f[1] for f in sorted_files]

        # 1. Duplicate Protection Fingerprinting (Section 24, scoped to account)
        fingerprint = compute_submission_fingerprint(
            raw_bytes_list, caption=caption, hashtags=hashtags, account_id=account_id
        )
        existing_published = JobRepository.get_published_job_by_fingerprint(db, fingerprint)
        if existing_published:
            logger.info(
                f"Duplicate submission detected for account '{account_id}'. Existing published job: {existing_published.job_id}"
            )
            return existing_published, True

        # 2. State: RECEIVED
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        final_caption = cls.construct_final_caption(caption, hashtags)
        job = JobRepository.create_job(
            db=db,
            job_id=job_id,
            fingerprint=fingerprint,
            account_id=account_id,
            account_handle=account_handle,
            caption=caption,
            hashtags=hashtags,
            final_caption=final_caption,
            image_count=len(sorted_files),
            status=JobStatus.RECEIVED.value,
        )
        logger.info(f"Created job {job_id} [RECEIVED] for account '{account_id}' with {len(sorted_files)} images")

        try:
            # 3. State: VALIDATING
            JobRepository.update_job_status(db, job_id, JobStatus.VALIDATING.value)
            
            # Verify carousel ordering bounds
            ordered_items = [
                OrderedImageItem(order=f[2], filename=f[0]) for f in sorted_files
            ]
            is_order_valid, order_err = validate_carousel_order(ordered_items)
            if not is_order_valid:
                raise ValueError(f"Carousel ordering validation failed: {order_err}")

            # Verify image format and readability
            validation_results = []
            for filename, raw_bytes, order_idx in sorted_files:
                val = ImageValidator.validate(raw_bytes, filename)
                if not val.is_valid:
                    raise ValueError(f"Validation failed for image #{order_idx} ({filename}): {val.error_message}")
                validation_results.append(val)

            # 4. State: PROCESSING
            JobRepository.update_job_status(db, job_id, JobStatus.PROCESSING.value)
            edits_by_order = {e.get("order_index"): e for e in (media_edits or []) if isinstance(e, dict)}
            prepared_items = []

            for (filename, raw_bytes, order_idx), val in zip(sorted_files, validation_results):
                edit = edits_by_order.get(order_idx, {})
                rotation = edit.get("rotation", 0)
                fit_mode = edit.get("fit_mode", "cover")
                alignment = edit.get("alignment", "center")
                is_muted = edit.get("is_muted", False)

                if val.media_type == "VIDEO":
                    logger.info(
                        f"Processing video #{order_idx} ({filename}) to 9:16 "
                        f"[rot={rotation}, fit={fit_mode}, align={alignment}, mute={is_muted}]..."
                    )
                    video_res = VideoProcessor.process(
                        raw_bytes,
                        rotation=rotation,
                        fit_mode=fit_mode,
                        alignment=alignment,
                        is_muted=is_muted,
                    )
                    prepared_items.append((filename, video_res.processed_bytes, order_idx, val, "VIDEO", video_res))
                else:
                    logger.info(
                        f"Processing image #{order_idx} ({filename}) to 9:16 "
                        f"[rot={rotation}, fit={fit_mode}, align={alignment}]..."
                    )
                    proc_result = ImageProcessor.process(
                        raw_bytes,
                        rotation=rotation,
                        fit_mode=fit_mode,
                        alignment=alignment,
                    )
                    prepared_items.append((filename, proc_result.processed_bytes, order_idx, val, "IMAGE", proc_result))

            # 5. State: UPLOADING
            JobRepository.update_job_status(db, job_id, JobStatus.UPLOADING.value)
            storage = get_storage_provider()
            uploaded_urls = []

            for filename, data_bytes, order_idx, val, media_type, proc_res in prepared_items:
                ext = "mp4" if media_type == "VIDEO" else "jpg"
                content_type = "video/mp4" if media_type == "VIDEO" else "image/jpeg"
                storage_key = StorageProvider.get_job_storage_path(job_id, order_idx, ext=ext)

                logger.info(f"Uploading {media_type} #{order_idx} to storage: {storage_key}")
                public_url = storage.upload(
                    data_bytes,
                    storage_key,
                    content_type=content_type
                )

                proc_w = proc_res.width if proc_res else val.width or 1080
                proc_h = proc_res.height if proc_res else val.height or 1920

                JobRepository.add_job_image(
                    db=db,
                    job_id=job_id,
                    order_index=order_idx,
                    original_filename=filename,
                    original_width=val.width,
                    original_height=val.height,
                    processed_width=proc_w,
                    processed_height=proc_h,
                    storage_key=storage_key,
                    public_url=public_url,
                    media_type=media_type,
                    status="READY",
                )
                uploaded_urls.append(public_url)

            # 6. State: VERIFYING_URLS
            JobRepository.update_job_status(db, job_id, JobStatus.VERIFYING_URLS.value)
            for idx, url in enumerate(uploaded_urls, start=1):
                logger.info(f"Verifying accessibility for image #{idx} URL: {url}")
                # For mock local URLs, bypass network request; for real URLs, verify HTTPS and 200 OK
                if not url.startswith("https://mock-storage.local/"):
                    is_accessible, url_err = verify_image_url_accessibility(url)
                    if not is_accessible:
                        raise ValueError(f"Image #{idx} URL could not be accessed: {url_err}")

            # 7. State: READY
            job = JobRepository.update_job_status(db, job_id, JobStatus.READY.value)
            logger.info(f"Job {job_id} is READY for publishing.")
            return job, False

        except Exception as exc:
            error_msg = str(exc)
            logger.error(f"Job {job_id} failed: {error_msg}")
            job = JobRepository.update_job_status(db, job_id, JobStatus.FAILED.value, error_message=error_msg)
            return job, False
