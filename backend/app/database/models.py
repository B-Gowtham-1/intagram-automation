from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from backend.app.database.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(64), unique=True, nullable=False, index=True)
    status = Column(String(32), nullable=False, default="RECEIVED", index=True)
    fingerprint = Column(String(64), nullable=True, index=True)
    account_id = Column(String(64), nullable=False, default="account_1", index=True)
    account_handle = Column(String(128), nullable=True)
    caption = Column(Text, nullable=True)
    hashtags = Column(Text, nullable=True)
    final_caption = Column(Text, nullable=True)
    image_count = Column(Integer, nullable=False, default=0)

    # Publishing fields (Make / Instagram)
    make_status = Column(String(32), nullable=True)
    make_execution_id = Column(String(128), nullable=True)
    instagram_post_id = Column(String(128), nullable=True)
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship to images
    images = relationship("JobImage", back_populates="job", cascade="all, delete-orphan", order_by="JobImage.order_index")


class JobImage(Base):
    __tablename__ = "job_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(64), ForeignKey("jobs.job_id", ondelete="CASCADE"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False)
    original_filename = Column(String(255), nullable=False)
    original_width = Column(Integer, nullable=False, default=0)
    original_height = Column(Integer, nullable=False, default=0)
    processed_width = Column(Integer, nullable=False, default=1080)
    processed_height = Column(Integer, nullable=False, default=1920)
    media_type = Column(String(16), nullable=False, default="IMAGE")
    duration_seconds = Column(Integer, nullable=True)
    storage_key = Column(String(512), nullable=False)
    public_url = Column(String(1024), nullable=False)
    status = Column(String(32), nullable=False, default="READY")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationship to job
    job = relationship("Job", back_populates="images")

    __table_args__ = (
        Index("idx_job_images_order", "job_id", "order_index"),
    )
