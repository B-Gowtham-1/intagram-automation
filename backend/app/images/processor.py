import io
from typing import Optional, Tuple
from PIL import Image, ImageOps
from pydantic import BaseModel
from backend.app.config.settings import get_settings

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

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


def crop_or_fit_to_ratio(
    img: Image.Image,
    target_ratio: float = 9.0 / 16.0,
    fit_mode: str = "cover",
    alignment: str = "center",
    target_size: Tuple[int, int] = (1080, 1920),
    tolerance: float = 0.015,
) -> Tuple[Image.Image, bool, Optional[Tuple[int, int, int, int]]]:
    """
    Normalizes an image to 9:16 target ratio:
    - fit_mode="cover": Crops the image to 9:16 using alignment ('center', 'top', 'bottom', 'left', 'right').
    - fit_mode="contain": Fits the full uncropped image onto a 1080x1920 canvas with clean dark backdrop.
    """
    tw, th = target_size
    w, h = img.size
    current_ratio = w / h

    if fit_mode == "contain":
        # Scale image proportionally so it fits completely within tw x th
        scale = min(tw / w, th / h)
        scaled_w = max(1, int(round(w * scale)))
        scaled_h = max(1, int(round(h * scale)))
        scaled_img = img.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

        # Create sleek Instagram dark canvas
        canvas = Image.new("RGB", (tw, th), (15, 23, 42))  # slate-950 tone
        paste_x = (tw - scaled_w) // 2
        paste_y = (th - scaled_h) // 2
        canvas.paste(scaled_img, (paste_x, paste_y))
        return canvas, False, None

    # Cover mode (crop)
    if abs(current_ratio - target_ratio) < tolerance:
        return img, False, None

    if current_ratio > target_ratio:
        # Image is wider than 9:16. Crop horizontal margins.
        new_w = max(1, int(round(h * target_ratio)))
        align_lower = alignment.lower()
        if "left" in align_lower or "start" in align_lower:
            offset_x = 0
        elif "right" in align_lower or "end" in align_lower:
            offset_x = w - new_w
        else:
            offset_x = (w - new_w) // 2
        crop_box = (offset_x, 0, offset_x + new_w, h)
    else:
        # Image is taller than 9:16. Crop vertical margins.
        new_h = max(1, int(round(w / target_ratio)))
        align_lower = alignment.lower()
        if "top" in align_lower or "start" in align_lower:
            offset_y = 0
        elif "bottom" in align_lower or "end" in align_lower:
            offset_y = h - new_h
        else:
            offset_y = (h - new_h) // 2
        crop_box = (0, offset_y, w, offset_y + new_h)

    cropped = img.crop(crop_box)
    return cropped, True, crop_box


# Backwards compatibility alias
center_crop_to_ratio = crop_or_fit_to_ratio


class ImageProcessor:
    """
    Hermes Image Processing Engine for Instagram Carousels.
    Pipeline:
      Raw Bytes -> Read -> EXIF transpose -> Rotate (0-360°) -> Normalize Color -> Crop/Fit to 9:16 -> Lanczos Resize -> High-Quality JPEG
    """

    @classmethod
    def process(
        cls,
        image_bytes: bytes,
        target_width: Optional[int] = None,
        target_height: Optional[int] = None,
        rotation: int = 0,
        fit_mode: str = "cover",
        alignment: str = "center",
    ) -> ProcessedImageResult:
        tw = target_width or settings.TARGET_WIDTH
        th = target_height or settings.TARGET_HEIGHT
        target_ratio = tw / th

        with Image.open(io.BytesIO(image_bytes)) as raw_img:
            # 1. Correct mobile camera EXIF orientation
            img = ImageOps.exif_transpose(raw_img)
            if img is None:
                img = raw_img.copy()

            # 2. User-specified rotation (clockwise 90, 180, 270)
            if rotation and rotation % 360 != 0:
                # PIL rotate is counter-clockwise, so negate for clockwise user input
                img = img.rotate(-rotation, expand=True)

            orig_w, orig_h = img.size
            orig_aspect_ratio = f"{orig_w}:{orig_h}"

            # 3. Convert transparent or palette modes to standard RGB
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                rgb_canvas = Image.new("RGB", img.size, (0, 0, 0))
                alpha_mask = img.convert("RGBA").split()[-1]
                rgb_canvas.paste(img.convert("RGB"), mask=alpha_mask)
                img = rgb_canvas
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # 4. Crop or Fit to 9:16 aspect ratio
            processed_img, was_cropped, crop_box = crop_or_fit_to_ratio(
                img,
                target_ratio=target_ratio,
                fit_mode=fit_mode,
                alignment=alignment,
                target_size=(tw, th),
                tolerance=0.015,
            )

            # 5. Resize to exact target dimensions with high-fidelity Lanczos resampling
            if processed_img.size != (tw, th):
                final_img = processed_img.resize((tw, th), Image.Resampling.LANCZOS)
            else:
                final_img = processed_img

            # 6. High-quality Instagram-compatible JPEG encoding
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
