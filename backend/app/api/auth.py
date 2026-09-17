from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.config.settings import get_settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(payload: LoginRequest):
    """Authenticate user against environment variables from .env."""
    username = payload.username.strip().lower()
    password = payload.password.strip()

    # User 1 check from .env
    u1_user = settings.USER1_USERNAME.strip().lower()
    u1_pass = settings.USER1_PASSWORD.strip()
    if u1_user and username == u1_user and password == u1_pass:
        return {
            "success": True,
            "user": {
                "id": "user-1",
                "username": settings.USER1_USERNAME.strip(),
                "name": settings.USER1_NAME.strip(),
                "mascot": settings.USER1_MASCOT.strip().lower(),
            }
        }

    # User 2 check from .env
    u2_user = settings.USER2_USERNAME.strip().lower()
    u2_pass = settings.USER2_PASSWORD.strip()
    if u2_user and username == u2_user and password == u2_pass:
        return {
            "success": True,
            "user": {
                "id": "user-2",
                "username": settings.USER2_USERNAME.strip(),
                "name": settings.USER2_NAME.strip(),
                "mascot": settings.USER2_MASCOT.strip().lower(),
            }
        }

    raise HTTPException(status_code=401, detail="ACCESS DENIED // INVALID USERNAME OR ACCESS KEY")
