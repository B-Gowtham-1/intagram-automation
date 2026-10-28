import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.database.database import engine, Base, SessionLocal
from backend.app.database.models import FacebookAccount, ConnectedInstagramPage
from backend.app.main import app

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_facebook_status_initially():
    # Clear any previous DB entries
    db = SessionLocal()
    db.query(ConnectedInstagramPage).delete()
    db.query(FacebookAccount).delete()
    db.commit()
    db.close()

    response = client.get("/api/facebook/status")
    assert response.status_code == 200
    data = response.json()
    assert data["is_connected"] is False
    assert data["pages"] == []
    assert data["selected_page"] is None

def test_facebook_connect_empty_token_fails():
    res = client.post("/api/facebook/connect", json={"access_token": "   "})
    assert res.status_code == 400
    assert "Access Token is required" in res.json()["detail"]

def test_facebook_connect_invalid_token_meta_rejected():
    # Sending a random bad token triggers real Meta Graph API call which rejects it with 400
    res = client.post("/api/facebook/connect", json={"access_token": "invalid_meta_test_token_12345"})
    assert res.status_code in (400, 500)
    # Detail should mention Meta Graph API Error or HTTP failure
    assert "Meta" in res.json()["detail"] or "Error" in res.json()["detail"]

def test_facebook_connect_and_page_selection_with_real_meta_response_mock():
    # Test Meta Graph API successful response handling
    mock_me_response = MagicMock()
    mock_me_response.status_code = 200
    mock_me_response.json.return_value = {
        "id": "real_fb_999888",
        "name": "Live Real Meta User"
    }

    mock_accounts_response = MagicMock()
    mock_accounts_response.status_code = 200
    mock_accounts_response.json.return_value = {
        "data": [
            {
                "id": "page_real_001",
                "name": "Live Brand Main Page",
                "access_token": "live_page_token_abc",
                "instagram_business_account": {
                    "id": "17841499990001",
                    "username": "live_real_brand",
                    "name": "Live Real Brand",
                    "profile_picture_url": "https://example.com/pic1.jpg"
                }
            },
            {
                "id": "page_real_002",
                "name": "Live Store Secondary Page",
                "access_token": "live_page_token_xyz",
                "instagram_business_account": {
                    "id": "17841499990002",
                    "username": "live_store_shop",
                    "name": "Live Store Shop",
                    "profile_picture_url": "https://example.com/pic2.jpg"
                }
            }
        ]
    }

    with patch("httpx.Client.get") as mock_get:
        def side_effect(url, **kwargs):
            if "/me/accounts" in url:
                return mock_accounts_response
            return mock_me_response
        mock_get.side_effect = side_effect

        # Call connect with real token flow
        res = client.post("/api/facebook/connect", json={"access_token": "EAAG_real_token_example"})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["user_name"] == "Live Real Meta User"
        assert data["count"] == 2

    # Verify status in database
    status = client.get("/api/facebook/status").json()
    assert status["is_connected"] is True
    assert status["user_name"] == "Live Real Meta User"
    assert len(status["pages"]) == 2
    assert status["selected_page"]["instagram_username"] == "live_real_brand"

    # Test selecting the second detected Instagram page
    select_res = client.post(
        "/api/facebook/select-page",
        json={"instagram_business_id": "17841499990002"}
    )
    assert select_res.status_code == 200
    assert select_res.json()["selected"]["instagram_username"] == "live_store_shop"

    # Verify status reflects new selection
    status_updated = client.get("/api/facebook/status").json()
    assert status_updated["selected_page"]["instagram_username"] == "live_store_shop"

    # Test disconnect
    disc = client.post("/api/facebook/disconnect")
    assert disc.status_code == 200
    assert client.get("/api/facebook/status").json()["is_connected"] is False

def test_browser_login_status_endpoint():
    res = client.get("/api/facebook/browser-login/status")
    assert res.status_code == 200
    data = res.json()
    assert "state" in data
    assert data["state"] in ("idle", "running", "success", "error")

