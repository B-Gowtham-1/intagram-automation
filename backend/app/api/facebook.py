import logging
import re
from typing import List, Optional
from urllib.parse import quote
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.config.settings import get_settings, BASE_DIR
from backend.app.database.database import get_db
from backend.app.database.models import FacebookAccount, ConnectedInstagramPage

router = APIRouter(prefix="/api/facebook", tags=["Facebook"])
logger = logging.getLogger("hermes.facebook")


class ConnectFacebookRequest(BaseModel):
    access_token: str
    app_id: Optional[str] = None


class SelectPageRequest(BaseModel):
    instagram_business_id: str


class InstagramPageResponse(BaseModel):
    id: int
    page_id: str
    page_name: str
    instagram_business_id: str
    instagram_username: str
    instagram_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_selected: bool


class FacebookStatusResponse(BaseModel):
    is_connected: bool
    user_name: Optional[str] = None
    user_id: Optional[str] = None
    pages: List[InstagramPageResponse] = []
    selected_page: Optional[InstagramPageResponse] = None


class MetaOAuthConfigResponse(BaseModel):
    app_id: str
    has_secret: bool
    redirect_uri: str


class UpdateMetaOAuthConfigRequest(BaseModel):
    app_id: str
    app_secret: Optional[str] = ""
    redirect_uri: Optional[str] = None


def discover_and_save_facebook_pages(token: str, app_id: Optional[str], db: Session) -> FacebookAccount:
    """
    Given a valid Meta User/Page Access token, queries Meta Graph API to fetch:
    1. User identity (/me)
    2. All managed Facebook pages & linked Instagram Business accounts (/me/accounts)
    Saves everything persistently into SQLite and returns the active FacebookAccount object.
    """
    user_id = "fb_user"
    user_name = "Facebook Account"
    detected_pages = []

    try:
        with httpx.Client(timeout=15.0) as client:
            # 1. Fetch User profile
            me_res = client.get(
                "https://graph.facebook.com/v21.0/me",
                params={"fields": "id,name", "access_token": token},
            )
            if me_res.status_code == 200:
                me_data = me_res.json()
                user_id = str(me_data.get("id", "fb_user"))
                user_name = me_data.get("name", "Facebook User")

            # 2. Fetch all managed pages with linked Instagram Business accounts
            accounts_res = client.get(
                "https://graph.facebook.com/v21.0/me/accounts",
                params={
                    "fields": "id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}",
                    "access_token": token,
                },
            )

            if accounts_res.status_code != 200:
                err_msg = accounts_res.json().get("error", {}).get("message", accounts_res.text)
                raise HTTPException(
                    status_code=400,
                    detail=f"Meta Graph API Error: {err_msg}",
                )

            acc_data = accounts_res.json().get("data", [])
            for page in acc_data:
                ig_acc = page.get("instagram_business_account")
                if ig_acc and ig_acc.get("id"):
                    detected_pages.append({
                        "page_id": str(page.get("id")),
                        "page_name": page.get("name", "Facebook Page"),
                        "page_access_token": page.get("access_token"),
                        "instagram_business_id": str(ig_acc.get("id")),
                        "instagram_username": ig_acc.get("username", "instagram_user"),
                        "instagram_name": ig_acc.get("name"),
                        "profile_picture_url": ig_acc.get("profile_picture_url"),
                    })

            if not detected_pages:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        "No Instagram Business accounts found on this Facebook account. "
                        "Ensure your Instagram account is switched to Business/Creator and linked to a Facebook Page in Meta Business Suite."
                    ),
                )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to query Meta Graph API: {str(exc)}")

    # Clear existing active accounts
    db.query(ConnectedInstagramPage).delete()
    db.query(FacebookAccount).delete()
    db.commit()

    fb_acc = FacebookAccount(
        user_id=user_id,
        user_name=user_name,
        access_token=token,
        app_id=app_id,
        is_active=1,
    )
    db.add(fb_acc)
    db.commit()
    db.refresh(fb_acc)

    for idx, p in enumerate(detected_pages):
        page_obj = ConnectedInstagramPage(
            facebook_account_id=fb_acc.id,
            page_id=p["page_id"],
            page_name=p["page_name"],
            page_access_token=p.get("page_access_token"),
            instagram_business_id=p["instagram_business_id"],
            instagram_username=p["instagram_username"],
            instagram_name=p.get("instagram_name"),
            profile_picture_url=p.get("profile_picture_url"),
            is_selected=1 if idx == 0 else 0,
        )
        db.add(page_obj)

    db.commit()
    db.refresh(fb_acc)
    return fb_acc


@router.get("/status", response_model=FacebookStatusResponse)
def get_facebook_status(db: Session = Depends(get_db)):
    """
    Returns the persistent Facebook connection status and all detected Instagram Business pages.
    """
    fb_acc = db.query(FacebookAccount).filter(FacebookAccount.is_active == 1).first()
    if not fb_acc:
        return FacebookStatusResponse(is_connected=False, pages=[])

    pages_resp = []
    selected = None
    for p in fb_acc.pages:
        page_item = InstagramPageResponse(
            id=p.id,
            page_id=p.page_id,
            page_name=p.page_name,
            instagram_business_id=p.instagram_business_id,
            instagram_username=p.instagram_username,
            instagram_name=p.instagram_name,
            profile_picture_url=p.profile_picture_url,
            is_selected=bool(p.is_selected),
        )
        pages_resp.append(page_item)
        if p.is_selected:
            selected = page_item

    # If none explicitly selected, pick first
    if not selected and pages_resp:
        selected = pages_resp[0]
        fb_acc.pages[0].is_selected = 1
        db.commit()

    return FacebookStatusResponse(
        is_connected=True,
        user_name=fb_acc.user_name,
        user_id=fb_acc.user_id,
        pages=pages_resp,
        selected_page=selected,
    )


@router.get("/oauth/config", response_model=MetaOAuthConfigResponse)
def get_oauth_config():
    """
    Returns Meta App OAuth configuration (App ID and status).
    """
    settings = get_settings()
    return MetaOAuthConfigResponse(
        app_id=settings.META_APP_ID or "",
        has_secret=bool(settings.META_APP_SECRET),
        redirect_uri=settings.META_REDIRECT_URI or "http://127.0.0.1:8000/api/facebook/oauth/callback",
    )


@router.post("/oauth/config")
def update_oauth_config(payload: UpdateMetaOAuthConfigRequest):
    """
    Updates Meta App ID and Secret in runtime and persists them to the .env file.
    """
    settings = get_settings()
    settings.META_APP_ID = payload.app_id.strip()
    if payload.app_secret:
        settings.META_APP_SECRET = payload.app_secret.strip()
    if payload.redirect_uri:
        settings.META_REDIRECT_URI = payload.redirect_uri.strip()

    # Persist to .env
    env_path = BASE_DIR / ".env"
    if env_path.exists():
        content = env_path.read_text(encoding="utf-8")
        if "META_APP_ID=" in content:
            content = re.sub(r"META_APP_ID=.*", f"META_APP_ID={settings.META_APP_ID}", content)
        else:
            content += f"\nMETA_APP_ID={settings.META_APP_ID}"

        if payload.app_secret:
            if "META_APP_SECRET=" in content:
                content = re.sub(r"META_APP_SECRET=.*", f"META_APP_SECRET={settings.META_APP_SECRET}", content)
            else:
                content += f"\nMETA_APP_SECRET={settings.META_APP_SECRET}"

        if payload.redirect_uri:
            if "META_REDIRECT_URI=" in content:
                content = re.sub(r"META_REDIRECT_URI=.*", f"META_REDIRECT_URI={settings.META_REDIRECT_URI}", content)
            else:
                content += f"\nMETA_REDIRECT_URI={settings.META_REDIRECT_URI}"

        env_path.write_text(content, encoding="utf-8")

    return {
        "success": True,
        "app_id": settings.META_APP_ID,
        "has_secret": bool(settings.META_APP_SECRET),
        "message": "Meta App OAuth configuration updated successfully.",
    }


@router.get("/oauth/login")
def oauth_login():
    """
    Initiates standard Facebook OAuth popup flow (like Make.com).
    Redirects user directly to Facebook's OAuth authorization dialog.
    """
    settings = get_settings()
    if not settings.META_APP_ID:
        raise HTTPException(
            status_code=400,
            detail="Meta App ID is not configured yet. Please configure your Meta App ID in the settings modal.",
        )

    scopes = [
        "public_profile",
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish",
    ]
    fb_oauth_url = (
        f"https://www.facebook.com/v21.0/dialog/oauth"
        f"?client_id={settings.META_APP_ID}"
        f"&redirect_uri={quote(settings.META_REDIRECT_URI, safe='')}"
        f"&scope={','.join(scopes)}"
        f"&response_type=code"
    )
    return RedirectResponse(url=fb_oauth_url)


@router.get("/oauth/callback", response_class=HTMLResponse)
def oauth_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    OAuth redirect callback from Facebook.
    Exchanges code for access token, detects Instagram pages, saves to DB,
    and returns a postMessage script that notifies the opener window and auto-closes.
    """
    if error:
        err_msg = error_description or error or "Facebook authorization was canceled."
        return HTMLResponse(
            content=f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Meta Authentication Error</title></head>
<body style="background:#090d16;color:#f43f5e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:24px;border:1px solid #f43f5e;border-radius:12px;background:#05070c;max-width:480px;">
    <h2>Authentication Canceled or Failed</h2>
    <p style="color:#cbd5e1;font-size:14px;">{err_msg}</p>
    <button onclick="window.close()" style="background:#f43f5e;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-top:12px;font-weight:bold;">Close Window</button>
  </div>
  <script>
    if (window.opener) {{
      window.opener.postMessage({{ type: 'FB_OAUTH_ERROR', error: '{err_msg}' }}, '*');
    }}
  </script>
</body>
</html>""",
            status_code=400,
        )

    if not code:
        return HTMLResponse(
            content="<h3>No authorization code provided by Meta.</h3>",
            status_code=400,
        )

    settings = get_settings()
    try:
        with httpx.Client(timeout=15.0) as client:
            # 1. Exchange code for access token
            token_params = {
                "client_id": settings.META_APP_ID,
                "client_secret": settings.META_APP_SECRET,
                "redirect_uri": settings.META_REDIRECT_URI,
                "code": code,
            }
            token_res = client.get("https://graph.facebook.com/v21.0/oauth/access_token", params=token_params)
            if token_res.status_code != 200:
                err = token_res.json().get("error", {}).get("message", token_res.text)
                raise Exception(f"Failed to exchange code: {err}")

            short_token = token_res.json().get("access_token")
            access_token = short_token

            # 2. Exchange for 60-day long-lived token if app_secret is present
            if settings.META_APP_SECRET:
                long_params = {
                    "grant_type": "fb_exchange_token",
                    "client_id": settings.META_APP_ID,
                    "client_secret": settings.META_APP_SECRET,
                    "fb_exchange_token": short_token,
                }
                long_res = client.get("https://graph.facebook.com/v21.0/oauth/access_token", params=long_params)
                if long_res.status_code == 200:
                    access_token = long_res.json().get("access_token", short_token)

        # 3. Discover and save pages
        fb_acc = discover_and_save_facebook_pages(access_token, settings.META_APP_ID, db)

        return HTMLResponse(
            content=f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Meta Authentication Complete</title></head>
<body style="background:#090d16;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:24px;border:1px solid #3b82f6;border-radius:12px;background:#05070c;max-width:480px;">
    <h2 style="color:#60a5fa;margin-bottom:8px;">✓ Logged in with Facebook!</h2>
    <p style="color:#94a3b8;font-size:14px;">Connected as <strong>{fb_acc.user_name}</strong>.</p>
    <p style="color:#22c55e;font-size:13px;font-weight:bold;">Detected {len(fb_acc.pages)} Instagram Business page(s).</p>
    <p style="color:#64748b;font-size:12px;margin-top:14px;">Closing window and returning to dashboard...</p>
  </div>
  <script>
    try {{
      if (window.opener) {{
        window.opener.postMessage({{ type: 'FB_OAUTH_SUCCESS', user_name: '{fb_acc.user_name}' }}, '*');
        setTimeout(() => window.close(), 1000);
      }} else {{
        setTimeout(() => {{ window.location.href = 'http://localhost:5173'; }}, 1200);
      }}
    }} catch(e) {{
      window.close();
    }}
  </script>
</body>
</html>"""
        )
    except Exception as exc:
        return HTMLResponse(
            content=f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Meta Discovery Error</title></head>
<body style="background:#090d16;color:#f43f5e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:24px;border:1px solid #f43f5e;border-radius:12px;background:#05070c;max-width:480px;">
    <h2>Connection Error</h2>
    <p style="color:#cbd5e1;font-size:14px;">{str(exc)}</p>
    <button onclick="window.close()" style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-top:12px;font-weight:bold;">Close Window</button>
  </div>
  <script>
    if (window.opener) {{
      window.opener.postMessage({{ type: 'FB_OAUTH_ERROR', error: '{str(exc)}' }}, '*');
    }}
  </script>
</body>
</html>""",
            status_code=400,
        )


@router.post("/connect")
def connect_facebook(payload: ConnectFacebookRequest, db: Session = Depends(get_db)):
    """
    Direct access token connect fallback.
    Queries Meta Graph API to automatically detect all linked Instagram Business accounts.
    Persists credentials in SQLite so user stays logged in across sessions.
    """
    token = payload.access_token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Access Token is required to connect your Facebook account.")

    fb_acc = discover_and_save_facebook_pages(token, payload.app_id, db)
    return {
        "success": True,
        "user_name": fb_acc.user_name,
        "user_id": fb_acc.user_id,
        "count": len(fb_acc.pages),
        "message": f"Successfully connected! Detected {len(fb_acc.pages)} Instagram Business page(s).",
    }


@router.post("/select-page")
def select_instagram_page(payload: SelectPageRequest, db: Session = Depends(get_db)):
    """
    Sets the active Instagram page target for N8N carousel publishing.
    """
    fb_acc = db.query(FacebookAccount).filter(FacebookAccount.is_active == 1).first()
    if not fb_acc:
        raise HTTPException(status_code=404, detail="No active Facebook account connected.")

    target = None
    for p in fb_acc.pages:
        if p.instagram_business_id == payload.instagram_business_id:
            p.is_selected = 1
            target = p
        else:
            p.is_selected = 0

    if not target:
        raise HTTPException(status_code=404, detail=f"Instagram account '{payload.instagram_business_id}' not found.")

    db.commit()
    return {
        "success": True,
        "selected": {
            "instagram_business_id": target.instagram_business_id,
            "instagram_username": target.instagram_username,
            "page_name": target.page_name,
        }
    }


@router.post("/disconnect")
def disconnect_facebook(db: Session = Depends(get_db)):
    """
    Disconnects the Facebook account and removes stored credentials.
    """
    db.query(ConnectedInstagramPage).delete()
    db.query(FacebookAccount).delete()
    db.commit()
    return {"success": True, "message": "Facebook account and connected pages disconnected."}


@router.post("/browser-login/start")
def start_facebook_browser_login():
    """
    Launches a real visible browser window pointing directly to facebook.com/login.
    The user logs in with their real Facebook credentials on facebook.com directly.
    Zero Meta Developer App, zero App IDs, zero tokens required!
    """
    from backend.app.publishing.facebook_browser_auth import FacebookBrowserAuthManager
    manager = FacebookBrowserAuthManager.get_instance()
    return manager.start_login_session()


@router.get("/browser-login/status")
def get_facebook_browser_login_status():
    """
    Returns the real-time status of the active Facebook browser login session.
    """
    from backend.app.publishing.facebook_browser_auth import FacebookBrowserAuthManager
    manager = FacebookBrowserAuthManager.get_instance()
    return manager.get_status()


class UpdatePageInstagramRequest(BaseModel):
    page_id: str
    instagram_username: str
    instagram_business_id: Optional[str] = None


@router.post("/update-page-instagram")
def update_page_instagram(payload: UpdatePageInstagramRequest, db: Session = Depends(get_db)):
    """
    Updates the linked Instagram handle/ID for a Facebook page.
    """
    page = db.query(ConnectedInstagramPage).filter(ConnectedInstagramPage.page_id == payload.page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found.")

    clean_handle = payload.instagram_username.strip().lstrip("@")
    page.instagram_username = clean_handle
    if payload.instagram_business_id:
        page.instagram_business_id = payload.instagram_business_id.strip()
    db.commit()
    return {
        "success": True,
        "page_id": page.page_id,
        "instagram_username": page.instagram_username,
        "instagram_business_id": page.instagram_business_id,
        "message": f"Updated linked Instagram account to @{page.instagram_username}",
    }


@router.post("/resync")
def resync_facebook_pages():
    """
    Triggers a headless resync using saved Facebook session cookies to re-fetch
    Facebook pages and Meta Business Suite connected Instagram accounts.
    """
    from backend.app.publishing.facebook_browser_auth import FacebookBrowserAuthManager
    manager = FacebookBrowserAuthManager.get_instance()
    res = manager.resync_pages()
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message", "Resync failed"))
    return res


