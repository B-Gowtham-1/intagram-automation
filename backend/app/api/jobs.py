import json
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.repositories import JobRepository
from backend.app.jobs.manager import JobManager

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.post("")
async def create_and_process_job(
    files: List[UploadFile] = File(...),
    order_indices: Optional[str] = Form(None, description="Optional JSON array of order indices, e.g. [1, 2, 3]"),
    media_edits: Optional[str] = Form(None, description="Optional JSON array of edit params per slide"),
    caption: Optional[str] = Form(None),
    hashtags: Optional[str] = Form(None),
    account_id: str = Form("account_1", description="Target Instagram account ID"),
    db: Session = Depends(get_db),
):
    """
    Intake endpoint for an Instagram Carousel publishing job:
    1. Reads uploaded media files (images & videos), explicit sequence order, and edit adjustments.
    2. Runs complete pipeline: Duplicate Check -> Validation -> 9:16 Normalization & Video Transcoding -> Storage Upload -> URL Verification.
    3. Returns Job status and public HTTPS URLs.
    """
    if not files or len(files) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Instagram carousels require at least 2 images, but {len(files) if files else 0} provided."
        )

    # Parse order indices if provided as JSON string, otherwise default to 1..N
    parsed_orders = []
    if order_indices:
        try:
            parsed_orders = json.loads(order_indices)
        except Exception:
            parsed_orders = list(range(1, len(files) + 1))
    else:
        parsed_orders = list(range(1, len(files) + 1))

    if len(parsed_orders) != len(files):
        parsed_orders = list(range(1, len(files) + 1))

    parsed_edits = []
    if media_edits:
        try:
            parsed_edits = json.loads(media_edits)
        except Exception:
            parsed_edits = []

    file_tuples = []
    for upload, order_idx in zip(files, parsed_orders):
        content = await upload.read()
        filename = upload.filename or f"image_{order_idx}.jpg"
        file_tuples.append((filename, content, order_idx))

    job, is_duplicate = JobManager.create_and_process_job(
        db=db,
        files=file_tuples,
        caption=caption,
        hashtags=hashtags,
        account_id=account_id,
        media_edits=parsed_edits,
    )

    return {
        "job_id": job.job_id,
        "status": job.status,
        "is_duplicate": is_duplicate,
        "account_id": getattr(job, "account_id", "account_1"),
        "account_handle": getattr(job, "account_handle", ""),
        "caption": job.caption,
        "hashtags": job.hashtags,
        "final_caption": job.final_caption,
        "image_count": job.image_count,
        "instagram_post_id": job.instagram_post_id,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "images": [
            {
                "order_index": img.order_index,
                "original_filename": img.original_filename,
                "original_width": img.original_width,
                "original_height": img.original_height,
                "processed_width": img.processed_width,
                "processed_height": img.processed_height,
                "public_url": img.public_url,
                "media_type": getattr(img, "media_type", "IMAGE") or "IMAGE",
                "status": img.status,
            }
            for img in job.images
        ],
    }


@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Retrieve status, images, and publish result for a specific carousel job."""
    job = JobRepository.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    return {
        "job_id": job.job_id,
        "status": job.status,
        "account_id": getattr(job, "account_id", "account_1"),
        "account_handle": getattr(job, "account_handle", ""),
        "caption": job.caption,
        "hashtags": job.hashtags,
        "final_caption": job.final_caption,
        "image_count": job.image_count,
        "make_status": job.make_status,
        "make_execution_id": job.make_execution_id,
        "instagram_post_id": job.instagram_post_id,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "published_at": job.published_at.isoformat() if job.published_at else None,
        "images": [
            {
                "order_index": img.order_index,
                "original_filename": img.original_filename,
                "original_width": img.original_width,
                "original_height": img.original_height,
                "processed_width": img.processed_width,
                "processed_height": img.processed_height,
                "public_url": img.public_url,
                "media_type": getattr(img, "media_type", "IMAGE") or "IMAGE",
                "status": img.status,
            }
            for img in job.images
        ],
    }


from datetime import datetime, timezone
from backend.app.publishing.factory import get_publishing_provider
from backend.app.jobs.states import JobStatus


@router.post("/{job_id}/publish")
def publish_job(job_id: str, db: Session = Depends(get_db)):
    """
    Publishes a READY carousel job through Make.com to Instagram:
    1. Verifies the job exists and is in READY state.
    2. Updates status to PUBLISHING.
    3. Dispatches to Make scenario.
    4. Upon verified confirmation, marks job as PUBLISHED.
    """
    job = JobRepository.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    # Duplicate protection check
    if job.status == JobStatus.PUBLISHED.value:
        return {
            "job_id": job.job_id,
            "status": "PUBLISHED",
            "account_id": getattr(job, "account_id", "account_1"),
            "account_handle": getattr(job, "account_handle", ""),
            "instagram_post_id": job.instagram_post_id,
            "message": "Carousel was already published.",
            "published_at": job.published_at.isoformat() if job.published_at else None,
        }

    if job.status != JobStatus.READY.value:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot publish job in '{job.status}' status. Job must be in READY status.",
        )

    # 1. Update status to PUBLISHING
    JobRepository.update_job_status(db, job_id, JobStatus.PUBLISHING.value)

    # 2. Call publishing provider scoped to job's target account
    publisher = get_publishing_provider(account_id=getattr(job, "account_id", None))
    result = publisher.publish_carousel(job)

    # 3. Interpret explicit publishing result
    if result.success:
        now = datetime.now(timezone.utc)
        job = JobRepository.update_job_status(
            db=db,
            job_id=job_id,
            status=JobStatus.PUBLISHED.value,
            instagram_post_id=result.instagram_post_id,
            make_execution_id=result.make_execution_id,
            make_status=result.make_status,
            published_at=now,
        )

        # Keep images stored in Supabase so Instagram's servers can reliably fetch the public URLs
        import logging
        logging.getLogger("hermes.jobs").info(
            f"Carousel dispatched to Make/Instagram for job {job_id} ({getattr(job, 'account_id', 'account_1')}). Preserving storage URLs for Instagram ingestion."
        )

        return {
            "job_id": job.job_id,
            "status": "PUBLISHED",
            "account_id": getattr(job, "account_id", "account_1"),
            "account_handle": getattr(job, "account_handle", ""),
            "instagram_post_id": job.instagram_post_id,
            "make_execution_id": job.make_execution_id,
            "published_at": job.published_at.isoformat() if job.published_at else None,
            "message": f"Carousel published successfully to Instagram ({getattr(job, 'account_handle', '')}).",
        }
    else:
        job = JobRepository.update_job_status(
            db=db,
            job_id=job_id,
            status=JobStatus.FAILED.value,
            error_message=result.error_message,
            make_status="FAILED",
        )
        raise HTTPException(
            status_code=502,
            detail=result.error_message or "Instagram publishing failed.",
        )


@router.get("")
def list_jobs(limit: int = 20, db: Session = Depends(get_db)):
    """Retrieve a list of recent carousel jobs."""
    jobs = JobRepository.list_jobs(db, limit=limit)
    return [
        {
            "job_id": j.job_id,
            "status": j.status,
            "account_id": getattr(j, "account_id", "account_1"),
            "account_handle": getattr(j, "account_handle", ""),
            "image_count": j.image_count,
            "instagram_post_id": j.instagram_post_id,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "published_at": j.published_at.isoformat() if j.published_at else None,
        }
        for j in jobs
    ]

