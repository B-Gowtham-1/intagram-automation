from functools import lru_cache
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for the repository
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_ENV: str = "development"
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000
    SECRET_KEY: str = "dev-secret-key-carousel-2026"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'data' / 'instagram.db'}"

    # Storage (Phase E) - Support for Supabase, R2, or S3
    STORAGE_PROVIDER: str = "supabase"  # "supabase" | "r2" | "s3" | "local"
    
    # Supabase Storage Configuration
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_BUCKET_NAME: str = "instagram-carousels"

    # Cloudflare R2 / S3 Storage (Alternative)
    R2_ENDPOINT_URL: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "instagram-carousels"
    R2_PUBLIC_BASE_URL: str = ""

    # Make.com Scenario (Phase G)
    MAKE_API_URL: str = "https://hook.eu1.make.com/v7bjry5eb52oo845g7v3l2vy1iijeoqw"
    MAKE_API_TOKEN: str = ""
    MAKE_SCENARIO_ID: str = ""
    # Account overrides (embedded in code)
    MAKE_API_URL_ACCOUNT_1: str = "https://hook.eu1.make.com/v7bjry5eb52oo845g7v3l2vy1iijeoqw"  # nature.art
    MAKE_API_URL_ACCOUNT_2: str = "https://hook.eu1.make.com/mno7p6gaegf9yvqrakh00fu1r7ab8d3g"  # frames of nature
    MAKE_API_URL_ACCOUNT_3: str = "https://hook.eu1.make.com/7lytlgeob24z2l2ws53b56wphjpifj9v"  # Frames of Movies

    # Image Processing Configuration (Phase D)
    TARGET_WIDTH: int = 1080
    TARGET_HEIGHT: int = 1920
    MAX_IMAGES_PER_CAROUSEL: int = 10
    MAX_IMAGE_SIZE_MB: int = 20

    # User Authentication (embedded in code)
    USER1_USERNAME: str = "gowtham"
    USER1_PASSWORD: str = "1317"
    USER1_NAME: str = "GOWTHAM"
    USER1_MASCOT: str = "pig"

    USER2_USERNAME: str = "manu"
    USER2_PASSWORD: str = "1317"
    USER2_NAME: str = "MANU"
    USER2_MASCOT: str = "dog"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
