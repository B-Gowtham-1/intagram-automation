from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.app.images.validator import ImageValidator, ImageValidationResult

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

    from backend.app.images.processor import ImageProcessor
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

