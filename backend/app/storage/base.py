from abc import ABC, abstractmethod


class StorageProvider(ABC):
    """
    Abstract interface for object storage providers (Supabase, Cloudflare R2, S3, Local).
    Ensures storage implementation is decoupled from publishing and orchestration logic.
    """

    @abstractmethod
    def upload(self, file_bytes: bytes, storage_path: str, content_type: str = "image/jpeg") -> str:
        """
        Uploads file bytes to the specified storage path and returns its public HTTPS URL.
        """
        pass

    @abstractmethod
    def get_public_url(self, storage_path: str) -> str:
        """
        Returns the public HTTPS URL for an object path.
        """
        pass

    @abstractmethod
    def delete(self, storage_path: str) -> bool:
        """
        Deletes the object at the specified storage path.
        """
        pass

    @abstractmethod
    def exists(self, storage_path: str) -> bool:
        """
        Checks whether the object exists at the specified storage path.
        """
        pass

    @staticmethod
    def get_job_storage_path(job_id: str, order_index: int, ext: str = "jpg") -> str:
        """
        Builds a standard job-based storage key according to Section 15:
        instagram/jobs/<job_id>/001.jpg
        """
        clean_ext = ext.lstrip(".")
        return f"instagram/jobs/{job_id}/{order_index:03d}.{clean_ext}"
