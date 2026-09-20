import io
from PIL import Image
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.images.validator import ImageValidator
from backend.app.images.ordering import OrderedImageItem, validate_carousel_order

client = TestClient(app)


def create_in_memory_image(width: int, height: int, format: str = "JPEG") -> bytes:
    """Helper creating a valid in-memory test image with Pillow."""
    img = Image.new("RGB", (width, height), color=(255, 100, 150))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


# --- Unit Tests: ImageValidator ---

def test_validator_accepts_valid_9_16_image():
    # 1080 x 1920 is exactly 9:16
    img_bytes = create_in_memory_image(1080, 1920, "JPEG")
    result = ImageValidator.validate(img_bytes, "portrait_9x16.jpg")
    assert result.is_valid is True
    assert result.width == 1080
    assert result.height == 1920
    assert result.aspect_ratio == "9:16"
    assert result.is_nine_sixteen is True
    assert result.needs_cropping is False
    assert result.error_message is None


def test_validator_detects_non_9_16_image():
    # 1200 x 1600 is 3:4 aspect ratio
    img_bytes = create_in_memory_image(1200, 1600, "JPEG")
    result = ImageValidator.validate(img_bytes, "portrait_3x4.jpg")
    assert result.is_valid is True
    assert result.width == 1200
    assert result.height == 1600
    assert result.is_nine_sixteen is False
    assert result.needs_cropping is True
    assert result.error_message is None


def test_validator_rejects_corrupted_image():
    bad_bytes = b"NOT_AN_IMAGE_HEADER_GARBAGE_BYTES_1234567890"
    result = ImageValidator.validate(bad_bytes, "corrupt.jpg")
    assert result.is_valid is False
    assert "Unable to read image" in result.error_message


def test_validator_rejects_empty_file():
    result = ImageValidator.validate(b"", "empty.jpg")
    assert result.is_valid is False
    assert "empty" in result.error_message.lower()


def test_validator_rejects_unsupported_extension():
    img_bytes = create_in_memory_image(1080, 1920, "JPEG")
    result = ImageValidator.validate(img_bytes, "document.pdf")
    assert result.is_valid is False
    assert "Unsupported file extension" in result.error_message


def test_validator_accepts_valid_heic_image():
    img_bytes = create_in_memory_image(1080, 1920, "HEIF")
    result = ImageValidator.validate(img_bytes, "photo.heic")
    assert result.is_valid is True
    assert result.width == 1080
    assert result.height == 1920
    assert result.format == "HEIF"
    assert result.is_nine_sixteen is True
    assert result.error_message is None


# --- Unit Tests: Ordering ---

def test_ordering_validator_valid_sequence():
    items = [
        OrderedImageItem(order=1, filename="1.jpg"),
        OrderedImageItem(order=2, filename="2.jpg"),
        OrderedImageItem(order=3, filename="3.jpg"),
    ]
    is_valid, error = validate_carousel_order(items)
    assert is_valid is True
    assert error is None


def test_ordering_validator_rejects_single_image():
    items = [OrderedImageItem(order=1, filename="1.jpg")]
    is_valid, error = validate_carousel_order(items)
    assert is_valid is False
    assert "at least 2 images" in error


def test_ordering_validator_rejects_more_than_10_images():
    items = [OrderedImageItem(order=i, filename=f"{i}.jpg") for i in range(1, 12)]
    is_valid, error = validate_carousel_order(items)
    assert is_valid is False
    assert "at most 10 images" in error


def test_ordering_validator_rejects_duplicate_order():
    items = [
        OrderedImageItem(order=1, filename="1.jpg"),
        OrderedImageItem(order=1, filename="duplicate.jpg"),
    ]
    is_valid, error = validate_carousel_order(items)
    assert is_valid is False
    assert "Duplicate order" in error


def test_ordering_validator_rejects_gap_in_order():
    items = [
        OrderedImageItem(order=1, filename="1.jpg"),
        OrderedImageItem(order=3, filename="3.jpg"),
    ]
    is_valid, error = validate_carousel_order(items)
    assert is_valid is False
    assert "contiguous" in error


# --- Integration Tests: API Endpoint ---

def test_api_validate_images_endpoint():
    img_9x16 = create_in_memory_image(1080, 1920, "JPEG")
    img_square = create_in_memory_image(1000, 1000, "PNG")
    bad_file = b"CORRUPTED_STREAM"

    files = [
        ("files", ("photo1.jpg", img_9x16, "image/jpeg")),
        ("files", ("photo2.png", img_square, "image/png")),
        ("files", ("photo3.jpg", bad_file, "image/jpeg")),
    ]

    response = client.post("/api/images/validate", files=files)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3

    assert data[0]["filename"] == "photo1.jpg"
    assert data[0]["is_valid"] is True
    assert data[0]["is_nine_sixteen"] is True

    assert data[1]["filename"] == "photo2.png"
    assert data[1]["is_valid"] is True
    assert data[1]["is_nine_sixteen"] is False
    assert data[1]["needs_cropping"] is True

    assert data[2]["filename"] == "photo3.jpg"
    assert data[2]["is_valid"] is False
    assert "Unable to read image" in data[2]["error_message"]


def test_api_validate_heic_image():
    img_heic = create_in_memory_image(1080, 1920, "HEIF")
    files = [("files", ("iphone_pic.heic", img_heic, "image/heic"))]
    response = client.post("/api/images/validate", files=files)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "iphone_pic.heic"
    assert data[0]["is_valid"] is True
    assert data[0]["format"] == "HEIF"
    assert data[0]["is_nine_sixteen"] is True
