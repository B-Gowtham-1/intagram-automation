import logging
from typing import Optional
from backend.app.config.settings import get_settings
from backend.app.publishing.base import PublishingProvider
from backend.app.publishing.make import MakePublisher
from backend.app.publishing.mock import MockPublisher

logger = logging.getLogger("hermes.publishing.factory")
settings = get_settings()


def get_publishing_provider(account_id: Optional[str] = None) -> PublishingProvider:
    """
    Returns configured real publishing provider.
    Strictly uses MakePublisher. Resolves account-specific webhook URL if provided.
    Raises an error if no webhook URL is configured.
    """
    settings = get_settings()
    from backend.app.config.accounts import get_account_by_id

    webhook_url = settings.MAKE_API_URL.strip() if settings.MAKE_API_URL else ""
    if account_id:
        acc = get_account_by_id(account_id)
        if acc and acc.webhook_url:
            webhook_url = acc.webhook_url.strip()

    if webhook_url:
        return MakePublisher(api_url=webhook_url)

    raise ValueError(
        "MAKE_API_URL is not configured in .env! "
        "Please provide your real Make.com webhook URL to publish."
    )
