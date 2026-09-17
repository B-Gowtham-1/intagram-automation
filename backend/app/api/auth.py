from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.config.settings import get_settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()


class LoginRequest(BaseModel):
    username: str
    password: str


AUTH_USERS_STORE = {
    "user1": {
        "id": "user-1",
        "username": "gowtham",
        "password": "1317",
        "name": "GOWTHAM",
        "mascot": "pig",
    },
    "user2": {
        "id": "user-2",
        "username": "manu",
        "password": "1317",
        "name": "MANU",
        "mascot": "dog",
    },
}


@router.post("/login")
def login(payload: LoginRequest):
    """Authenticate user against embedded credentials in code."""
    username = payload.username.strip().lower()
    password = payload.password.strip()

    # User 1 check
    u1_user = (settings.USER1_USERNAME or AUTH_USERS_STORE["user1"]["username"]).strip().lower()
    u1_pass = (settings.USER1_PASSWORD or AUTH_USERS_STORE["user1"]["password"]).strip()
    u1_name = (settings.USER1_NAME or AUTH_USERS_STORE["user1"]["name"]).strip()
    u1_mascot = (settings.USER1_MASCOT or AUTH_USERS_STORE["user1"]["mascot"]).strip().lower()
    if username == u1_user and password == u1_pass:
        return {
            "success": True,
            "user": {
                "id": "user-1",
                "username": u1_user,
                "name": u1_name,
                "mascot": u1_mascot,
            }
        }

    # User 2 check
    u2_user = (settings.USER2_USERNAME or AUTH_USERS_STORE["user2"]["username"]).strip().lower()
    u2_pass = (settings.USER2_PASSWORD or AUTH_USERS_STORE["user2"]["password"]).strip()
    u2_name = (settings.USER2_NAME or AUTH_USERS_STORE["user2"]["name"]).strip()
    u2_mascot = (settings.USER2_MASCOT or AUTH_USERS_STORE["user2"]["mascot"]).strip().lower()
    if username == u2_user and password == u2_pass:
        return {
            "success": True,
            "user": {
                "id": "user-2",
                "username": u2_user,
                "name": u2_name,
                "mascot": u2_mascot,
            }
        }

    raise HTTPException(status_code=401, detail="ACCESS DENIED // INVALID USERNAME OR ACCESS KEY")
