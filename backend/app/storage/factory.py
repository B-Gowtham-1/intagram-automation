import logging
from backend.app.config.settings import get_settings
from backend.app.storage.base import StorageProvider
from backend.app.storage.supabase import SupabaseStorageProvider
from backend.app.storage.local import LocalStorageProvider

logger = logging.getLogger("hermes.storage.factory")
settings = get_settings()


def get_storage_provider() -> StorageProvider:
    """
    Factory function returning the configured StorageProvider instance.
    Defaults to SupabaseStorageProvider if credentials are set,
    otherwise falls back to LocalStorageProvider with a warning.
    """
    provider_name = settings.STORAGE_PROVIDER.lower()

    if provider_name == "supabase":
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            return SupabaseStorageProvider()
        else:
            logger.warning("Supabase credentials not configured in .env. Falling back to LocalStorageProvider.")
            return LocalStorageProvider()

    if provider_name == "local":
        return LocalStorageProvider()

    # Default fallback
    return LocalStorageProvider()
