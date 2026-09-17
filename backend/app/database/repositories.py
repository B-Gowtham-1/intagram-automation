from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from backend.app.database.models import Job, JobImage


class JobRepository:
    @staticmethod
    def create_job(
        db: Session,
        job_id: str,
        fingerprint: str,
        account_id: str = "account_1",
        account_handle: Optional[str] = None,
        caption: Optional[str] = None,
        hashtags: Optional[str] = None,
        final_caption: Optional[str] = None,
        image_count: int = 0,
        status: str = "RECEIVED",
    ) -> Job:
        now = datetime.now(timezone.utc)
        job = Job(
            job_id=job_id,
            fingerprint=fingerprint,
            account_id=account_id,
            account_handle=account_handle,
            caption=caption,
            hashtags=hashtags,
            final_caption=final_caption,
            image_count=image_count,
            status=status,
            created_at=now,
            updated_at=now,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def get_job_by_id(db: Session, job_id: str) -> Optional[Job]:
        return db.query(Job).filter(Job.job_id == job_id).first()

    @staticmethod
    def get_published_job_by_fingerprint(db: Session, fingerprint: str) -> Optional[Job]:
        """Check if an identical carousel submission has already been successfully published."""
        return (
            db.query(Job)
            .filter(Job.fingerprint == fingerprint, Job.status == "PUBLISHED")
            .first()
        )

    @staticmethod
    def update_job_status(
        db: Session,
        job_id: str,
        status: str,
        error_message: Optional[str] = None,
        make_status: Optional[str] = None,
        make_execution_id: Optional[str] = None,
        instagram_post_id: Optional[str] = None,
        published_at: Optional[datetime] = None,
    ) -> Optional[Job]:
        job = db.query(Job).filter(Job.job_id == job_id).first()
        if not job:
            return None

        job.status = status
        job.updated_at = datetime.now(timezone.utc)

        if error_message is not None:
            job.error_message = error_message
        if make_status is not None:
            job.make_status = make_status
        if make_execution_id is not None:
            job.make_execution_id = make_execution_id
        if instagram_post_id is not None:
            job.instagram_post_id = instagram_post_id
        if published_at is not None:
            job.published_at = published_at

        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def add_job_image(
        db: Session,
        job_id: str,
        order_index: int,
        original_filename: str,
        original_width: int,
        original_height: int,
        processed_width: int,
        processed_height: int,
        storage_key: str,
        public_url: str,
        media_type: str = "IMAGE",
        duration_seconds: Optional[int] = None,
        status: str = "READY",
    ) -> JobImage:
        image = JobImage(
            job_id=job_id,
            order_index=order_index,
            original_filename=original_filename,
            original_width=original_width,
            original_height=original_height,
            processed_width=processed_width,
            processed_height=processed_height,
            media_type=media_type,
            duration_seconds=duration_seconds,
            storage_key=storage_key,
            public_url=public_url,
            status=status,
            created_at=datetime.now(timezone.utc),
        )
        db.add(image)
        db.commit()
        db.refresh(image)
        return image

    @staticmethod
    def list_jobs(db: Session, limit: int = 50) -> List[Job]:
        return db.query(Job).order_by(Job.created_at.desc()).limit(limit).all()
