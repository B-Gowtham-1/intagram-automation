import logging
from backend.app.config.settings import get_settings
from backend.app.publishing.base import PublishingProvider
from backend.app.publishing.make import MakePublisher
from backend.app.publishing.mock import MockPublisher

logger = logging.getLogger("hermes.publishing.factory")
settings = get_settings()


def get_publishing_provider() -> PublishingProvider:
    """
    Returns configured real publishing provider.
    Strictly uses MakePublisher. Raises an error if MAKE_API_URL is missing.
    No mock data or simulations.
    """
    settings = get_settings()
    if settings.MAKE_API_URL and settings.MAKE_API_URL.strip():
        return MakePublisher(api_url=settings.MAKE_API_URL.strip())

    raise ValueError(
        "MAKE_API_URL is not configured in .env! "
        "Please provide your real Make.com webhook URL to publish."
    )
