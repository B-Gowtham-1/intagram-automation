import io
import math
from pathlib import Path
from typing import Optional
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from backend.app.config.settings import get_settings

settings = get_settings()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class ImageValidationResult(BaseModel):
    filename: str
    is_valid: bool
    size_bytes: int
    format: Optional[str] = None
    width: int = 0
    height: int = 0
    aspect_ratio: str = "Unknown"
    is_nine_sixteen: bool = False
    needs_cropping: bool = False
    error_message: Optional[str] = None


def calculate_aspect_ratio(width: int, height: int) -> tuple[str, bool]:
    """
    Computes aspect ratio string and determines whether it matches 9:16 portrait.
    Target 9:16 ratio is 9 / 16 = 0.5625.
    """
    if width <= 0 or height <= 0:
        return "Unknown", False

    ratio = width / height
    target_ratio = 9.0 / 16.0  # 0.5625

    # 1.5% tolerance for 9:16
    if abs(ratio - target_ratio) < 0.015:
        return "9:16", True

    # Standard common ratios
    if abs(ratio - 1.0) < 0.015:
        return "1:1", False
    if abs(ratio - 4.0 / 5.0) < 0.015:
        return "4:5", False
    if abs(ratio - 16.0 / 9.0) < 0.015:
        return "16:9", False
    if abs(ratio - 4.0 / 3.0) < 0.015:
        return "4:3", False

    # Simplified ratio using GCD
    gcd_val = math.gcd(width, height)
    sw = width // gcd_val
    sh = height // gcd_val

    if sw <= 20 and sh <= 20:
        return f"{sw}:{sh}", False

    return f"{ratio:.2f}:1", False


class ImageValidator:
    @staticmethod
    def validate(file_bytes: bytes, filename: str) -> ImageValidationResult:
        size_bytes = len(file_bytes)

        # 1. Check for empty file
        if size_bytes == 0:
            return ImageValidationResult(
                filename=filename,
                is_valid=False,
                size_bytes=0,
                error_message="Unable to read image. File is empty."
            )

        # 2. Extension validation
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            return ImageValidationResult(
                filename=filename,
                is_valid=False,
                size_bytes=size_bytes,
                error_message=f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        # 3. File size check against configured limit
        max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
        if size_bytes > max_bytes:
            return ImageValidationResult(
                filename=filename,
                is_valid=False,
                size_bytes=size_bytes,
                error_message=f"File size ({size_bytes / (1024*1024):.1f} MB) exceeds maximum allowed {settings.MAX_IMAGE_SIZE_MB} MB."
            )

        # 4. Pillow Readability & Integrity Check
        try:
            # First pass: stream verification
            with Image.open(io.BytesIO(file_bytes)) as probe:
                probe.verify()

            # Second pass: reopen to extract metadata (since verify() invalidates internal stream state)
            with Image.open(io.BytesIO(file_bytes)) as img:
                img_format = img.format
                width, height = img.size

                if img_format not in ALLOWED_FORMATS:
                    return ImageValidationResult(
                        filename=filename,
                        is_valid=False,
                        size_bytes=size_bytes,
                        format=img_format,
                        error_message=f"Image format '{img_format}' is not supported for Instagram publishing. Allowed: {', '.join(sorted(ALLOWED_FORMATS))}"
                    )

                if width < 150 or height < 150:
                    return ImageValidationResult(
                        filename=filename,
                        is_valid=False,
                        size_bytes=size_bytes,
                        format=img_format,
                        width=width,
                        height=height,
                        error_message=f"Image dimensions ({width}x{height}) are too small. Minimum required is 150x150 pixels."
                    )

                aspect_ratio, is_nine_sixteen = calculate_aspect_ratio(width, height)

                return ImageValidationResult(
                    filename=filename,
                    is_valid=True,
                    size_bytes=size_bytes,
                    format=img_format,
                    width=width,
                    height=height,
                    aspect_ratio=aspect_ratio,
                    is_nine_sixteen=is_nine_sixteen,
                    needs_cropping=not is_nine_sixteen,
                    error_message=None
                )

        except (UnidentifiedImageError, OSError, Exception) as exc:
            return ImageValidationResult(
                filename=filename,
                is_valid=False,
                size_bytes=size_bytes,
                error_message="Unable to read image. Please select another image."
            )
