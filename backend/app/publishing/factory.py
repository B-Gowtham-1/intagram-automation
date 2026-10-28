import logging
from typing import Optional
from backend.app.config.settings import get_settings
from backend.app.publishing.base import PublishingProvider
from backend.app.publishing.make import MakePublisher

logger = logging.getLogger("hermes.publishing.factory")
settings = get_settings()


def get_publishing_provider(
    account_id: Optional[str] = None,
    provider: str = "make",
    custom_webhook_url: Optional[str] = None,
) -> PublishingProvider:
    """
    Returns configured Make.com publishing provider instance.
    """
    from backend.app.config.accounts import get_account_by_id

    webhook_url = (custom_webhook_url or "").strip()
    if not webhook_url and account_id:
        acc = get_account_by_id(account_id)
        if acc and acc.webhook_url:
            webhook_url = acc.webhook_url.strip()

    if not webhook_url:
        webhook_url = settings.MAKE_API_URL.strip() if settings.MAKE_API_URL else ""

    if webhook_url:
        return MakePublisher(api_url=webhook_url)

    raise ValueError(
        "MAKE_API_URL is not configured in .env! "
        "Please provide your real Make.com webhook URL to publish."
    )
