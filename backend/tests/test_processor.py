import io
from PIL import Image
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.images.processor import ImageProcessor, center_crop_to_ratio

client = TestClient(app)


def create_test_image_bytes(width: int, height: int, mode: str = "RGB", format: str = "JPEG") -> bytes:
    img = Image.new(mode, (width, height), color=(200, 50, 100) if mode != "RGBA" else (200, 50, 100, 180))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


# --- Unit Tests: center_crop_to_ratio ---

def test_crop_skips_when_already_9_16():
    # 1080 x 1920 is exactly 9:16
    img = Image.new("RGB", (1080, 1920))
    cropped, was_cropped, crop_box = center_crop_to_ratio(img, target_ratio=9 / 16)
    assert was_cropped is False
    assert crop_box is None
    assert cropped.size == (1080, 1920)


def test_crop_wide_image_center_crops_horizontally():
    # 1000 x 1000 square (ratio 1.0 > 9/16 = 0.5625)
    # Expected new width = round(1000 * 9 / 16) = 562
    # Offset = (1000 - 562) // 2 = 219
    img = Image.new("RGB", (1000, 1000))
    cropped, was_cropped, crop_box = center_crop_to_ratio(img, target_ratio=9 / 16)
    assert was_cropped is True
    assert crop_box is not None
    left, top, right, bottom = crop_box
    assert top == 0
    assert bottom == 1000
    assert (right - left) == int(round(1000 * 9 / 16))
    assert cropped.size == (int(round(1000 * 9 / 16)), 1000)


def test_crop_tall_image_center_crops_vertically():
    # 1000 x 2500 (ratio 0.4 < 9/16 = 0.5625)
    # Expected new height = round(1000 / (9/16)) = 1778
    img = Image.new("RGB", (1000, 2500))
    cropped, was_cropped, crop_box = center_crop_to_ratio(img, target_ratio=9 / 16)
    assert was_cropped is True
    assert crop_box is not None
    left, top, right, bottom = crop_box
    assert left == 0
    assert right == 1000
    assert (bottom - top) == int(round(1000 / (9 / 16)))
    assert cropped.size == (1000, int(round(1000 / (9 / 16))))


# --- Unit Tests: ImageProcessor.process ---

def test_process_9_16_image_no_crop():
    """Test 4 from Spec: 1080x1920 requires no unnecessary crop."""
    raw_bytes = create_test_image_bytes(1080, 1920, "RGB", "JPEG")
    result = ImageProcessor.process(raw_bytes)

    assert result.was_cropped is False
    assert result.crop_box is None
    assert result.width == 1080
    assert result.height == 1920
    assert result.format == "JPEG"

    # Verify that the generated output is a valid JPEG with exact dimensions
    with Image.open(io.BytesIO(result.processed_bytes)) as out_img:
        assert out_img.format == "JPEG"
        assert out_img.size == (1080, 1920)


def test_process_non_9_16_image_crops_to_9_16():
    """Test 5 from Spec: 1200x1600 (3:4) is normalized to 9:16."""
    raw_bytes = create_test_image_bytes(1200, 1600, "RGB", "JPEG")
    result = ImageProcessor.process(raw_bytes)

    assert result.was_cropped is True
    assert result.crop_box is not None
    assert result.width == 1080
    assert result.height == 1920

    with Image.open(io.BytesIO(result.processed_bytes)) as out_img:
        assert out_img.format == "JPEG"
        assert out_img.size == (1080, 1920)


def test_process_landscape_16_9_image():
    raw_bytes = create_test_image_bytes(1920, 1080, "RGB", "JPEG")
    result = ImageProcessor.process(raw_bytes)

    assert result.was_cropped is True
    assert result.width == 1080
    assert result.height == 1920

    with Image.open(io.BytesIO(result.processed_bytes)) as out_img:
        assert out_img.size == (1080, 1920)


def test_process_rgba_png_converts_to_rgb_jpeg():
    raw_bytes = create_test_image_bytes(800, 800, "RGBA", "PNG")
    result = ImageProcessor.process(raw_bytes)

    assert result.format == "JPEG"
    assert result.width == 1080
    assert result.height == 1920

    with Image.open(io.BytesIO(result.processed_bytes)) as out_img:
        assert out_img.format == "JPEG"
        assert out_img.mode == "RGB"
        assert out_img.size == (1080, 1920)


def test_process_custom_dimensions():
    raw_bytes = create_test_image_bytes(500, 500, "RGB", "JPEG")
    result = ImageProcessor.process(raw_bytes, target_width=720, target_height=1280)

    assert result.width == 720
    assert result.height == 1280

    with Image.open(io.BytesIO(result.processed_bytes)) as out_img:
        assert out_img.size == (720, 1280)


# --- Integration Test: API Endpoint ---

def test_api_process_endpoint():
    raw_bytes = create_test_image_bytes(1200, 1600, "RGB", "JPEG")
    files = {"file": ("test_pic.jpg", raw_bytes, "image/jpeg")}

    response = client.post("/api/images/process", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["filename"] == "test_pic.jpg"
    assert data["format"] == "JPEG"
    assert data["width"] == 1080
    assert data["height"] == 1920
    assert data["was_cropped"] is True
    assert data["original_width"] == 1200
    assert data["original_height"] == 1600
    assert data["final_size_bytes"] > 0
