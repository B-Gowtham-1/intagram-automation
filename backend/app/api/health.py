from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.config.settings import get_settings
from backend.app.database.database import get_db

router = APIRouter(prefix="/api", tags=["Health"])
settings = get_settings()


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint verifying API and database readiness."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)}"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "app": "Instagram Carousel Automation Agent",
        "version": "1.0.0",
        "env": settings.APP_ENV,
        "database": db_status
    }
