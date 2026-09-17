import os
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.config.settings import get_settings

settings = get_settings()

# Ensure the directory for SQLite database exists if using a local file path
if settings.DATABASE_URL.startswith("sqlite:///"):
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_dir = Path(db_path).parent
    db_dir.mkdir(parents=True, exist_ok=True)

# SQLite engine configuration
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations(engine):
    """Ensure newly added columns exist in existing SQLite database tables."""
    from sqlalchemy import text
    with engine.begin() as conn:
        try:
            res = conn.execute(text("PRAGMA table_info(jobs)"))
            job_cols = {row[1] for row in res.fetchall()}
            if job_cols:
                if "account_id" not in job_cols:
                    conn.execute(text("ALTER TABLE jobs ADD COLUMN account_id VARCHAR(64) DEFAULT 'account_1'"))
                if "account_handle" not in job_cols:
                    conn.execute(text("ALTER TABLE jobs ADD COLUMN account_handle VARCHAR(128)"))

            res_img = conn.execute(text("PRAGMA table_info(job_images)"))
            img_cols = {row[1] for row in res_img.fetchall()}
            if img_cols:
                if "media_type" not in img_cols:
                    conn.execute(text("ALTER TABLE job_images ADD COLUMN media_type VARCHAR(16) DEFAULT 'IMAGE'"))
                if "duration_seconds" not in img_cols:
                    conn.execute(text("ALTER TABLE job_images ADD COLUMN duration_seconds INTEGER"))
        except Exception:
            pass

