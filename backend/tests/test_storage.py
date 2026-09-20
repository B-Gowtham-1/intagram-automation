import httpx
from pathlib import Path
from backend.app.storage.base import StorageProvider
from backend.app.storage.local import LocalStorageProvider
from backend.app.storage.supabase import SupabaseStorageProvider
from backend.app.validation.urls import verify_image_url_accessibility


# --- 1. Storage Path Generation ---

def test_get_job_storage_path():
    path1 = StorageProvider.get_job_storage_path("job_abc", 1, "jpg")
    assert path1 == "instagram/jobs/job_abc/001.jpg"

    path2 = StorageProvider.get_job_storage_path("job_abc", 10, ".jpeg")
    assert path2 == "instagram/jobs/job_abc/010.jpeg"


# --- 2. Local Storage Provider ---

def test_local_storage_provider(tmp_path: Path):
    provider = LocalStorageProvider(base_dir=tmp_path)
    storage_path = "instagram/jobs/test_job/001.jpg"
    test_bytes = b"IMAGE_DATA_123"

    url = provider.upload(test_bytes, storage_path, "image/jpeg")
    assert "instagram/jobs/test_job/001.jpg" in url
    assert provider.exists(storage_path) is True

    # Delete
    deleted = provider.delete(storage_path)
    assert deleted is True
    assert provider.exists(storage_path) is False


# --- 3. Supabase Storage Provider Unit Tests (Mocked Transport) ---

def test_supabase_public_url():
    provider = SupabaseStorageProvider(
        supabase_url="https://xyzproject.supabase.co",
        service_role_key="dummy-key",
        bucket_name="instagram-carousels",
    )
    url = provider.get_public_url("instagram/jobs/test/001.jpg")
    assert url == "https://xyzproject.supabase.co/storage/v1/object/public/instagram-carousels/instagram/jobs/test/001.jpg"


def test_supabase_upload_mocked():
    # Mock httpx handler simulating Supabase response
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["apikey"] == "dummy-key"
        assert "instagram/jobs/test/001.jpg" in str(request.url)
        return httpx.Response(200, json={"Key": "instagram-carousels/instagram/jobs/test/001.jpg"})

    provider = SupabaseStorageProvider(
        supabase_url="https://xyzproject.supabase.co",
        service_role_key="dummy-key",
        bucket_name="instagram-carousels",
    )

    # Monkeypatch Client with mock transport
    transport = httpx.MockTransport(handler)
    original_client = httpx.Client

    try:
        httpx.Client = lambda **kwargs: original_client(transport=transport, **kwargs)
        url = provider.upload(b"FAKE_DATA", "instagram/jobs/test/001.jpg", "image/jpeg")
        assert "https://xyzproject.supabase.co/storage/v1/object/public/instagram-carousels/instagram/jobs/test/001.jpg" == url
    finally:
        httpx.Client = original_client


def test_ensure_jpeg_if_heic():
    import io
    from PIL import Image
    # Create test HEIF image
    img = Image.new("RGB", (200, 200), color=(10, 20, 30))
    buf = io.BytesIO()
    img.save(buf, format="HEIF")
    heic_bytes = buf.getvalue()

    jpeg_bytes, new_path, mime = StorageProvider.ensure_jpeg_if_heic(
        heic_bytes, "uploads/pic.heic", "image/heic"
    )
    assert new_path == "uploads/pic.jpg"
    assert mime == "image/jpeg"
    with Image.open(io.BytesIO(jpeg_bytes)) as out_img:
        assert out_img.format == "JPEG"


def test_supabase_upload_converts_heic_to_jpeg():
    import io
    from PIL import Image
    img = Image.new("RGB", (100, 100), color="green")
    buf = io.BytesIO()
    img.save(buf, format="HEIF")
    heic_bytes = buf.getvalue()

    received_headers = {}
    received_url = ""
    received_content = b""

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal received_headers, received_url, received_content
        received_headers = dict(request.headers)
        received_url = str(request.url)
        received_content = request.content
        return httpx.Response(200, json={"Key": "instagram-carousels/instagram/jobs/test/001.jpg"})

    provider = SupabaseStorageProvider(
        supabase_url="https://xyzproject.supabase.co",
        service_role_key="dummy-key",
        bucket_name="instagram-carousels",
    )

    transport = httpx.MockTransport(handler)
    original_client = httpx.Client

    try:
        httpx.Client = lambda **kwargs: original_client(transport=transport, **kwargs)
        url = provider.upload(heic_bytes, "instagram/jobs/test/001.heic", "image/heic")
        assert url.endswith("001.jpg")
        assert received_headers["content-type"] == "image/jpeg"
        assert "001.jpg" in received_url
        with Image.open(io.BytesIO(received_content)) as out_img:
            assert out_img.format == "JPEG"
    finally:
        httpx.Client = original_client


# --- 4. URL Accessibility Verification (Section 17) ---

def test_url_accessibility_rejects_non_https():
    is_valid, err = verify_image_url_accessibility("http://example.com/image.jpg")
    assert is_valid is False
    assert "not secure HTTPS" in err


def test_url_accessibility_rejects_localhost():
    is_valid, err = verify_image_url_accessibility("https://localhost:8000/image.jpg")
    assert is_valid is False
    assert "localhost" in err


def test_url_accessibility_success_mocked():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, headers={"Content-Type": "image/jpeg"})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    is_valid, err = verify_image_url_accessibility("https://pub.supabase.co/storage/001.jpg", client=client)
    assert is_valid is True
    assert err is None


def test_url_accessibility_404_error_mocked():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    is_valid, err = verify_image_url_accessibility("https://pub.supabase.co/storage/404.jpg", client=client)
    assert is_valid is False
    assert "404" in err


def test_url_accessibility_non_image_content_type():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, headers={"Content-Type": "text/html; charset=utf-8"})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    is_valid, err = verify_image_url_accessibility("https://pub.supabase.co/storage/page.html", client=client)
    assert is_valid is False
    assert "Content-Type" in err
