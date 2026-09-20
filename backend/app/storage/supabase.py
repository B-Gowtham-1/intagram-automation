import logging
import httpx
from backend.app.storage.base import StorageProvider
from backend.app.config.settings import get_settings

logger = logging.getLogger("hermes.storage.supabase")
settings = get_settings()


class SupabaseStorageProvider(StorageProvider):
    """
    Supabase Storage Provider implementing the StorageProvider interface.
    Uses Supabase REST Storage API (/storage/v1/object) via HTTPX.
    """

    def __init__(
        self,
        supabase_url: str | None = None,
        service_role_key: str | None = None,
        bucket_name: str | None = None,
    ):
        self.supabase_url = (supabase_url or settings.SUPABASE_URL).rstrip("/")
        self.service_role_key = service_role_key or settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket_name = bucket_name or settings.SUPABASE_BUCKET_NAME

        if not self.supabase_url or not self.service_role_key:
            logger.warning("Supabase credentials not fully configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.")

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
        }

    def get_public_url(self, storage_path: str) -> str:
        clean_path = storage_path.lstrip("/")
        return f"{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{clean_path}"

    def upload(self, file_bytes: bytes, storage_path: str, content_type: str = "image/jpeg") -> str:
        file_bytes, storage_path, content_type = self.ensure_jpeg_if_heic(file_bytes, storage_path, content_type)
        clean_path = storage_path.lstrip("/")
        upload_url = f"{self.supabase_url}/storage/v1/object/{self.bucket_name}/{clean_path}"

        headers = {
            **self._headers,
            "Content-Type": content_type,
            "x-upsert": "true",
        }

        with httpx.Client(timeout=30.0) as client:
            response = client.post(upload_url, content=file_bytes, headers=headers)
            if response.status_code not in (200, 201):
                logger.error(f"Supabase upload failed [{response.status_code}]: {response.text}")
                raise RuntimeError(
                    f"Supabase Storage upload failed with status {response.status_code}: {response.text}"
                )

        public_url = self.get_public_url(clean_path)
        logger.info(f"Successfully uploaded to Supabase Storage: {clean_path} -> {public_url}")
        return public_url

    def exists(self, storage_path: str) -> bool:
        public_url = self.get_public_url(storage_path)
        with httpx.Client(timeout=10.0) as client:
            try:
                response = client.head(public_url)
                return response.status_code == 200
            except httpx.RequestError:
                return False

    def delete(self, storage_path: str) -> bool:
        clean_path = storage_path.lstrip("/")
        delete_url = f"{self.supabase_url}/storage/v1/object/{self.bucket_name}"

        # Supabase API expects JSON array of prefixes to delete
        with httpx.Client(timeout=15.0) as client:
            response = client.request(
                "DELETE",
                delete_url,
                headers={**self._headers, "Content-Type": "application/json"},
                json={"prefixes": [clean_path]},
            )
            if response.status_code in (200, 204):
                logger.info(f"Deleted from Supabase Storage: {clean_path}")
                return True
            else:
                logger.warning(f"Supabase delete returned {response.status_code}: {response.text}")
                return False
