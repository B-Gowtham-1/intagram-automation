import logging
from pathlib import Path
from backend.app.storage.base import StorageProvider
from backend.app.config.settings import BASE_DIR

logger = logging.getLogger("hermes.storage.local")


class LocalStorageProvider(StorageProvider):
    """
    Local filesystem storage provider for offline testing and development.
    Stores files in data/storage.
    """

    def __init__(self, base_dir: Path | None = None):
        self.root = (base_dir or (BASE_DIR / "data" / "storage")).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _full_path(self, storage_path: str) -> Path:
        clean = storage_path.lstrip("/").replace("/", "\\")
        return self.root / clean

    def upload(self, file_bytes: bytes, storage_path: str, content_type: str = "image/jpeg") -> str:
        target = self._full_path(storage_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(file_bytes)
        logger.info(f"Local storage upload saved: {target}")
        return self.get_public_url(storage_path)

    def get_public_url(self, storage_path: str) -> str:
        # In mock/offline mode, return simulated HTTPS url
        clean = storage_path.lstrip("/")
        return f"https://mock-storage.local/{clean}"

    def exists(self, storage_path: str) -> bool:
        return self._full_path(storage_path).exists()

    def delete(self, storage_path: str) -> bool:
        target = self._full_path(storage_path)
        if target.exists():
            target.unlink()
            return True
        return False
