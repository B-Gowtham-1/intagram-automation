from typing import List, Optional
import json
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.app.images.validator import ImageValidator, ImageValidationResult
from backend.app.images.processor import ImageProcessor
from backend.app.images.video_processor import VideoProcessor
from backend.app.storage.factory import get_storage_provider

router = APIRouter(prefix="/api/images", tags=["Images"])


@router.post("/validate", response_model=List[ImageValidationResult])
async def validate_images(files: List[UploadFile] = File(...)):
    """
    Validates uploaded images against Instagram Carousel requirements:
    - Extension & MIME format check
    - Binary readability with Pillow
    - Dimension checks & 9:16 aspect ratio detection
    - File size limits
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided for validation.")

    results: List[ImageValidationResult] = []

    for upload in files:
        content = await upload.read()
        filename = upload.filename or "unknown.jpg"
        result = ImageValidator.validate(content, filename)
        results.append(result)

    return results


@router.post("/process")
async def process_single_image(file: UploadFile = File(...)):
    """
    Normalizes an uploaded image to Instagram 9:16 portrait format (1080x1920).
    Performs center-crop if non-9:16, Lanczos resize, and high-quality JPEG encode.
    """
    content = await file.read()
    filename = file.filename or "image.jpg"

    # Validate readability
    validation = ImageValidator.validate(content, filename)
    if not validation.is_valid:
        raise HTTPException(status_code=400, detail=validation.error_message)

    result = ImageProcessor.process(content)

    return {
        "filename": filename,
        "format": result.format,
        "width": result.width,
        "height": result.height,
        "was_cropped": result.was_cropped,
        "crop_box": result.crop_box,
        "original_width": result.original_width,
        "original_height": result.original_height,
        "final_size_bytes": result.final_size_bytes,
    }


@router.post("/upload-public-links")
async def upload_for_public_links(
    files: List[UploadFile] = File(...),
    media_edits: Optional[str] = Form(None),
):
    """
    Direct Media Public Links Generation Feature:
    Uploads 1 to 10 images or videos, crops/normalizes to 9:16,
    stores directly in Supabase Storage, and returns public HTTPS links immediately
    without creating or publishing an Instagram job.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="At least 1 media file must be provided.")

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 media files can be processed at once.")

    parsed_edits = []
    if media_edits:
        try:
            parsed_edits = json.loads(media_edits)
        except Exception:
            parsed_edits = []
    edits_by_order = {e.get("order_index"): e for e in parsed_edits if isinstance(e, dict)}

    storage = get_storage_provider()
    session_id = uuid.uuid4().hex[:10]
    results = []

    for idx, upload in enumerate(files):
        order_idx = idx + 1
        content = await upload.read()
        filename = upload.filename or f"media_{order_idx}.jpg"

        val = ImageValidator.validate(content, filename)
        if not val.is_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Validation error for '{filename}': {val.error_message}"
            )

        edit = edits_by_order.get(order_idx, {})
        rotation = edit.get("rotation", 0)
        fit_mode = edit.get("fit_mode", "cover")
        alignment = edit.get("alignment", "center")
        is_muted = edit.get("is_muted", False)

        if val.media_type == "VIDEO":
            proc_video = VideoProcessor.process(
                content,
                rotation=rotation,
                fit_mode=fit_mode,
                alignment=alignment,
                is_muted=is_muted,
            )
            data_bytes = proc_video.processed_bytes
            content_type = "video/mp4"
            ext = "mp4"
            proc_w = proc_video.width
            proc_h = proc_video.height
        else:
            proc_img = ImageProcessor.process(
                content,
                rotation=rotation,
                fit_mode=fit_mode,
                alignment=alignment,
            )
            data_bytes = proc_img.processed_bytes
            content_type = "image/jpeg"
            ext = "jpg"
            proc_w = proc_img.width
            proc_h = proc_img.height

        storage_key = f"public_links/{session_id}/slide_{order_idx}.{ext}"
        public_url = storage.upload(data_bytes, storage_key, content_type=content_type)

        results.append({
            "order_index": order_idx,
            "filename": filename,
            "media_type": val.media_type,
            "public_url": public_url,
            "width": proc_w,
            "height": proc_h,
            "size_bytes": len(data_bytes),
        })

    return {
        "success": True,
        "count": len(results),
        "links": results,
    }

