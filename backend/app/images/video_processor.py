import os
import shutil
import logging
import tempfile
import subprocess
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger("hermes.video_processor")


@dataclass
class VideoProcessResult:
    processed_bytes: bytes
    width: int
    height: int
    duration: Optional[float] = None
    error_message: Optional[str] = None


class VideoProcessor:
    TARGET_WIDTH = 1080
    TARGET_HEIGHT = 1920

    @classmethod
    def is_ffmpeg_available(cls) -> bool:
        """Check if ffmpeg executable is available in PATH."""
        return shutil.which("ffmpeg") is not None

    @classmethod
    def process(
        cls,
        video_bytes: bytes,
        rotation: int = 0,
        fit_mode: str = "cover",
        alignment: str = "center",
        is_muted: bool = False,
        trim_start: Optional[float] = None,
        trim_end: Optional[float] = None,
    ) -> VideoProcessResult:
        """
        Processes and crops/normalizes a video file to Instagram 9:16 Carousel standard (1080x1920):
        1. Applies rotation (0, 90, 180, 270 degrees).
        2. Fits or crops to 1080x1920:
           - 'cover': fills 9:16 screen, cropping excess based on alignment (top/center/bottom or left/center/right).
           - 'contain': preserves entire video frame with clean black padding bars.
        3. Handles audio (muted vs AAC encoded).
        4. Encodes to H.264 / AAC MP4 with faststart flag.
        """
        if not cls.is_ffmpeg_available():
            logger.warning("ffmpeg is not installed on system. Passing raw video bytes through.")
            return VideoProcessResult(
                processed_bytes=video_bytes,
                width=cls.TARGET_WIDTH,
                height=cls.TARGET_HEIGHT,
            )

        rotation_normalized = (rotation or 0) % 360
        fit_mode_clean = (fit_mode or "cover").lower()
        alignment_clean = (alignment or "center").lower()

        # Create temporary input and output files
        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, "input_raw.mp4")
            output_path = os.path.join(tmpdir, "output_processed.mp4")

            try:
                with open(input_path, "wb") as f:
                    f.write(video_bytes)

                # Assemble video filter chain
                filters = []

                # 1. Orientation / Rotation filter
                if rotation_normalized == 90:
                    filters.append("transpose=1")
                elif rotation_normalized == 180:
                    filters.append("transpose=1,transpose=1")
                elif rotation_normalized == 270:
                    filters.append("transpose=2")

                # 2. Framing & Sizing filter
                if fit_mode_clean == "contain":
                    # Scale to fit inside 1080x1920 and pad letterbox/pillarbox
                    filters.append(
                        f"scale={cls.TARGET_WIDTH}:{cls.TARGET_HEIGHT}:force_original_aspect_ratio=decrease,"
                        f"pad={cls.TARGET_WIDTH}:{cls.TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black"
                    )
                else:
                    # Cover / Fill mode: scale to fill 1080x1920 then crop
                    if alignment_clean == "left":
                        x_expr = "0"
                    elif alignment_clean == "right":
                        x_expr = f"in_w-{cls.TARGET_WIDTH}"
                    else:
                        x_expr = f"(in_w-{cls.TARGET_WIDTH})/2"

                    if alignment_clean == "top":
                        y_expr = "0"
                    elif alignment_clean == "bottom":
                        y_expr = f"in_h-{cls.TARGET_HEIGHT}"
                    else:
                        y_expr = f"(in_h-{cls.TARGET_HEIGHT})/2"

                    filters.append(
                        f"scale={cls.TARGET_WIDTH}:{cls.TARGET_HEIGHT}:force_original_aspect_ratio=increase,"
                        f"crop={cls.TARGET_WIDTH}:{cls.TARGET_HEIGHT}:{x_expr}:{y_expr}"
                    )

                filter_arg = ",".join(filters)

                # Audio parameters
                audio_args = ["-an"] if is_muted else ["-c:a", "aac", "-b:a", "128k"]

                # Optional trim parameters
                trim_args = []
                if trim_start is not None and trim_start >= 0:
                    trim_args.extend(["-ss", str(trim_start)])
                if trim_end is not None and trim_end > (trim_start or 0):
                    trim_args.extend(["-to", str(trim_end)])

                cmd = [
                    "ffmpeg",
                    "-y",
                    *trim_args,
                    "-i", input_path,
                    "-vf", filter_arg,
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-preset", "fast",
                    "-crf", "22",
                    "-movflags", "+faststart",
                    *audio_args,
                    output_path,
                ]

                logger.info(f"Executing ffmpeg video processing: {' '.join(cmd)}")
                proc = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=90,
                    check=False,
                )

                if proc.returncode != 0 or not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                    logger.error(f"FFmpeg failed with code {proc.returncode}: {proc.stderr}")
                    return VideoProcessResult(
                        processed_bytes=video_bytes,
                        width=cls.TARGET_WIDTH,
                        height=cls.TARGET_HEIGHT,
                        error_message=f"FFmpeg transcoding failed: {proc.stderr[:200]}",
                    )

                with open(output_path, "rb") as out_f:
                    processed_data = out_f.read()

                logger.info(
                    f"Video successfully processed to 9:16 ({cls.TARGET_WIDTH}x{cls.TARGET_HEIGHT}). "
                    f"Original size: {len(video_bytes)} bytes, Output size: {len(processed_data)} bytes."
                )

                return VideoProcessResult(
                    processed_bytes=processed_data,
                    width=cls.TARGET_WIDTH,
                    height=cls.TARGET_HEIGHT,
                )

            except subprocess.TimeoutExpired:
                logger.error("FFmpeg video processing timed out (exceeded 90s).")
                return VideoProcessResult(
                    processed_bytes=video_bytes,
                    width=cls.TARGET_WIDTH,
                    height=cls.TARGET_HEIGHT,
                    error_message="Video processing timed out.",
                )
            except Exception as e:
                logger.error(f"Unexpected error in video processing: {e}")
                return VideoProcessResult(
                    processed_bytes=video_bytes,
                    width=cls.TARGET_WIDTH,
                    height=cls.TARGET_HEIGHT,
                    error_message=str(e),
                )
