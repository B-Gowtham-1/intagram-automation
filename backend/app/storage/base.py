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

    @staticmethod
    def ensure_jpeg_if_heic(file_bytes: bytes, storage_path: str, content_type: str = "image/jpeg") -> tuple[bytes, str, str]:
        """
        If file_bytes, storage_path, or content_type indicates HEIC/HEIF format,
        converts the media to JPEG before uploading to storage, updating storage_path and content_type.
        """
        is_heic_path = storage_path.lower().endswith((".heic", ".heif"))
        is_heic_mime = content_type.lower() in ("image/heic", "image/heif")
        is_heic_magic = (
            len(file_bytes) > 12
            and file_bytes[4:8] == b"ftyp"
            and file_bytes[8:12].lower() in (b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1")
        )

        if is_heic_path or is_heic_mime or is_heic_magic:
            import io
            import re
            from PIL import Image

            try:
                import pillow_heif
                pillow_heif.register_heif_opener()
            except ImportError:
                pass

            try:
                with Image.open(io.BytesIO(file_bytes)) as img:
                    rgb_img = img.convert("RGB")
                    buf = io.BytesIO()
                    rgb_img.save(buf, format="JPEG", quality=95)
                    new_bytes = buf.getvalue()
                    new_path = re.sub(r"\.(heic|heif)$", ".jpg", storage_path, flags=re.IGNORECASE)
                    if not new_path.lower().endswith((".jpg", ".jpeg")):
                        new_path += ".jpg"
                    return new_bytes, new_path, "image/jpeg"
            except Exception:
                # If Pillow conversion fails, return original bytes and path
                pass

        return file_bytes, storage_path, content_type
