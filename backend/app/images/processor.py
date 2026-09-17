import io
from typing import Optional, Tuple
from PIL import Image, ImageOps
from pydantic import BaseModel
from backend.app.config.settings import get_settings

settings = get_settings()


class ProcessedImageResult(BaseModel):
    processed_bytes: bytes
    format: str = "JPEG"
    width: int
    height: int
    was_cropped: bool
    crop_box: Optional[Tuple[int, int, int, int]] = None
    original_width: int
    original_height: int
    original_aspect_ratio: str
    final_size_bytes: int


def center_crop_to_ratio(
    img: Image.Image,
    target_ratio: float = 9.0 / 16.0,
    tolerance: float = 0.015,
) -> Tuple[Image.Image, bool, Optional[Tuple[int, int, int, int]]]:
    """
    Center-crops an image to the target aspect ratio while strictly preserving
    proportions (never stretching or distorting).
    
    Returns:
        (cropped_image, was_cropped, crop_box)
    """
    w, h = img.size
    current_ratio = w / h

    # If already at target aspect ratio within tolerance, do not crop
    if abs(current_ratio - target_ratio) < tolerance:
        return img, False, None

    if current_ratio > target_ratio:
        # Image is wider than 9:16 (e.g. 1:1, 4:5, 16:9). Crop left/right margins.
        new_w = max(1, int(round(h * target_ratio)))
        offset_x = (w - new_w) // 2
        crop_box = (offset_x, 0, offset_x + new_w, h)
    else:
        # Image is taller than 9:16. Crop top/bottom margins.
        new_h = max(1, int(round(w / target_ratio)))
        offset_y = (h - new_h) // 2
        crop_box = (0, offset_y, w, offset_y + new_h)

    cropped = img.crop(crop_box)
    return cropped, True, crop_box


class ImageProcessor:
    """
    Hermes Image Processing Engine for Instagram Carousels.
    Pipeline:
      Raw Bytes -> Read -> EXIF transpose -> Normalize Color -> Center Crop to 9:16 -> Lanczos Resize -> High-Quality JPEG
    """

    @classmethod
    def process(
        cls,
        image_bytes: bytes,
        target_width: Optional[int] = None,
        target_height: Optional[int] = None,
    ) -> ProcessedImageResult:
        tw = target_width or settings.TARGET_WIDTH
        th = target_height or settings.TARGET_HEIGHT
        target_ratio = tw / th

        with Image.open(io.BytesIO(image_bytes)) as raw_img:
            # 1. Correct mobile camera EXIF orientation
            img = ImageOps.exif_transpose(raw_img)
            if img is None:
                img = raw_img.copy()

            orig_w, orig_h = img.size
            orig_aspect_ratio = f"{orig_w}:{orig_h}"

            # 2. Convert transparent or palette modes to standard RGB
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                rgb_canvas = Image.new("RGB", img.size, (0, 0, 0))
                # If RGBA, paste with alpha channel as mask
                alpha_mask = img.convert("RGBA").split()[-1]
                rgb_canvas.paste(img.convert("RGB"), mask=alpha_mask)
                img = rgb_canvas
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # 3. Center crop to 9:16 aspect ratio if necessary
            cropped_img, was_cropped, crop_box = center_crop_to_ratio(
                img,
                target_ratio=target_ratio,
                tolerance=0.015,
            )

            # 4. Resize to target dimensions (e.g. 1080x1920) with high-fidelity Lanczos resampling
            if cropped_img.size != (tw, th):
                final_img = cropped_img.resize((tw, th), Image.Resampling.LANCZOS)
            else:
                final_img = cropped_img

            # 5. High-quality Instagram-compatible JPEG encoding
            output_buf = io.BytesIO()
            final_img.save(
                output_buf,
                format="JPEG",
                quality=95,
                optimize=True,
                progressive=True,
            )
            processed_data = output_buf.getvalue()

            return ProcessedImageResult(
                processed_bytes=processed_data,
                format="JPEG",
                width=tw,
                height=th,
                was_cropped=was_cropped,
                crop_box=crop_box,
                original_width=orig_w,
                original_height=orig_h,
                original_aspect_ratio=orig_aspect_ratio,
                final_size_bytes=len(processed_data),
            )
