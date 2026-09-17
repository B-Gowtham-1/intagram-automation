from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel
from backend.app.database.models import Job


class PublishingResult(BaseModel):
    success: bool
    job_id: str
    instagram_post_id: Optional[str] = None
    make_execution_id: Optional[str] = None
    make_status: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Dict[str, Any] = {}


class PublishingProvider(ABC):
    """
    Abstract interface for publishing carousel posts.
    Hermes is decoupled from the concrete publishing bridge (Make.com, Direct API, etc.).
    """

    @abstractmethod
    def publish_carousel(self, job: Job) -> PublishingResult:
        """
        Dispatches the prepared job to the publishing provider and explicitly
        interprets the response to determine success or failure.
        """
        pass
