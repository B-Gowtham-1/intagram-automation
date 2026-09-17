import pytest
import subprocess
from backend.app.images.video_processor import VideoProcessor


import tempfile
import os

def create_synthetic_mp4() -> bytes:
    """Helper to generate a 1-second 640x360 MP4 test video using ffmpeg."""
    if not VideoProcessor.is_ffmpeg_available():
        pytest.skip("ffmpeg not available")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_out = os.path.join(tmpdir, "test.mp4")
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "testsrc=duration=1:size=640x360:rate=25",
            "-f", "lavfi", "-i", "sine=frequency=1000:duration=1",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            tmp_out,
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        with open(tmp_out, "rb") as f:
            return f.read()


def test_video_processor_cover_crop():
    if not VideoProcessor.is_ffmpeg_available():
        pytest.skip("ffmpeg not available")
    
    raw = create_synthetic_mp4()
    result = VideoProcessor.process(raw, rotation=0, fit_mode="cover", alignment="center")
    
    assert result.error_message is None
    assert len(result.processed_bytes) > 0
    assert result.width == 1080
    assert result.height == 1920


def test_video_processor_contain_pad():
    if not VideoProcessor.is_ffmpeg_available():
        pytest.skip("ffmpeg not available")
    
    raw = create_synthetic_mp4()
    result = VideoProcessor.process(raw, rotation=90, fit_mode="contain", is_muted=True)
    
    assert result.error_message is None
    assert len(result.processed_bytes) > 0
    assert result.width == 1080
    assert result.height == 1920
