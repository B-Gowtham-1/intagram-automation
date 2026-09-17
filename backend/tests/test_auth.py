from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config.accounts import get_configured_accounts, get_account_by_id
from backend.app.config.settings import get_settings

client = TestClient(app)


def test_auth_embedded_user1():
    response = client.post("/api/auth/login", json={"username": "gowtham", "password": "1317"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["id"] == "user-1"
    assert data["user"]["username"] == "gowtham"
    assert data["user"]["name"] == "GOWTHAM"
    assert data["user"]["mascot"] == "pig"


def test_auth_embedded_user2():
    response = client.post("/api/auth/login", json={"username": "manu", "password": "1317"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["id"] == "user-2"
    assert data["user"]["username"] == "manu"
    assert data["user"]["name"] == "MANU"
    assert data["user"]["mascot"] == "dog"


def test_auth_invalid_credentials():
    response = client.post("/api/auth/login", json={"username": "gowtham", "password": "wrong"})
    assert response.status_code == 401


def test_account_overrides_embedded():
    accounts = get_configured_accounts()
    assert len(accounts) == 3

    acc1 = get_account_by_id("account_1")
    assert acc1 is not None
    assert acc1.name == "nature.art"
    assert acc1.webhook_url == "https://hook.eu1.make.com/v7bjry5eb52oo845g7v3l2vy1iijeoqw"

    acc2 = get_account_by_id("account_2")
    assert acc2 is not None
    assert acc2.name == "frames of nature"
    assert acc2.webhook_url == "https://hook.eu1.make.com/mno7p6gaegf9yvqrakh00fu1r7ab8d3g"

    acc3 = get_account_by_id("account_3")
    assert acc3 is not None
    assert acc3.name == "frames of movies"
    assert acc3.webhook_url == "https://hook.eu1.make.com/7lytlgeob24z2l2ws53b56wphjpifj9v"


def test_image_processing_config_defaults():
    settings = get_settings()
    assert settings.TARGET_WIDTH == 1080
    assert settings.TARGET_HEIGHT == 1920
    assert settings.MAX_IMAGES_PER_CAROUSEL == 10
    assert settings.MAX_IMAGE_SIZE_MB == 20
