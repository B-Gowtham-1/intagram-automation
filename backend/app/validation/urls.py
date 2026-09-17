import logging
from typing import Tuple, Optional
import httpx

logger = logging.getLogger("hermes.validation.urls")


def verify_image_url_accessibility(
    url: str,
    timeout: float = 12.0,
    client: Optional[httpx.Client] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Validates that an image URL is publicly accessible over HTTPS by Instagram/Meta:
    1. Scheme must be strictly HTTPS (never http://, file://, localhost, etc.)
    2. Must be reachable over the network
    3. Must return a 2xx HTTP status code
    4. Content-Type header must indicate an image format (e.g. image/jpeg, image/png, image/webp)

    Returns:
        (is_accessible: bool, error_message: str | None)
    """
    if not url:
        return False, "URL is empty."

    # 1. Scheme and host safety check
    if not url.startswith("https://"):
        return False, f"URL '{url}' is not secure HTTPS. Instagram requires public HTTPS URLs."

    lower_url = url.lower()
    if "localhost" in lower_url or "127.0.0.1" in lower_url or "0.0.0.0" in lower_url:
        return False, f"URL '{url}' points to localhost. Instagram requires a publicly accessible domain."

    # 2. HTTP Request check
    def _do_check(http_client: httpx.Client) -> Tuple[bool, Optional[str]]:
        try:
            # First try HEAD request to save bandwidth
            response = http_client.head(url, follow_redirects=True)
            if response.status_code == 405:  # Method Not Allowed, fallback to GET
                response = http_client.get(url, follow_redirects=True)

            if response.status_code < 200 or response.status_code >= 300:
                return False, f"URL returned HTTP status {response.status_code} ({response.reason_phrase})."

            content_type = response.headers.get("content-type", "").lower()
            if not content_type.startswith("image/"):
                return False, f"URL Content-Type '{content_type}' is not an image type."

            return True, None

        except httpx.TimeoutException:
            return False, f"Request to URL timed out after {timeout} seconds."
        except httpx.RequestError as exc:
            return False, f"Could not access URL: {str(exc)}"

    if client is not None:
        return _do_check(client)

    with httpx.Client(timeout=timeout) as new_client:
        return _do_check(new_client)
