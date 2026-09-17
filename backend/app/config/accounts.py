from typing import Dict, List, Optional
from pydantic import BaseModel
from backend.app.config.settings import get_settings


class AccountConfig(BaseModel):
    id: str
    name: str
    handle: str
    description: str
    webhook_url: Optional[str] = None


def _clean_url(url: str | None) -> Optional[str]:
    if not url:
        return None
    # Strip any inline comments (e.g. #nature.art) and whitespace
    cleaned = url.split("#")[0].strip()
    return cleaned if cleaned else None


def get_configured_accounts() -> List[AccountConfig]:
    """
    Returns the list of 3 hardcoded Instagram accounts:
    1. nature.art
    2. frames of nature
    3. frames of movies
    """
    settings = get_settings()

    # Read webhook URLs with fallback to MAKE_API_URL
    url_1 = getattr(settings, "MAKE_API_URL_ACCOUNT_1", "") or settings.MAKE_API_URL
    url_2 = getattr(settings, "MAKE_API_URL_ACCOUNT_2", "") or settings.MAKE_API_URL
    url_3 = getattr(settings, "MAKE_API_URL_ACCOUNT_3", "") or settings.MAKE_API_URL

    return [
        AccountConfig(
            id="account_1",
            name="nature.art",
            handle="@nature.art",
            description="Nature art and visual scenery carousels",
            webhook_url=_clean_url(url_1),
        ),
        AccountConfig(
            id="account_2",
            name="frames of nature",
            handle="@framesofnature",
            description="Wildlife, landscapes and nature photography frames",
            webhook_url=_clean_url(url_2),
        ),
        AccountConfig(
            id="account_3",
            name="frames of movies",
            handle="@framesofmovies",
            description="Cinematic film stills and movie scene frames",
            webhook_url=_clean_url(url_3),
        ),
    ]


def get_account_by_id(account_id: str) -> Optional[AccountConfig]:
    accounts = get_configured_accounts()
    for acc in accounts:
        if acc.id == account_id:
            return acc
    return None
