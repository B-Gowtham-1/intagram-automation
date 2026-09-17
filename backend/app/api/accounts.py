from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from backend.app.config.accounts import get_configured_accounts, AccountConfig

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])


class AccountResponse(BaseModel):
    id: str
    name: str
    handle: str
    description: str
    has_webhook: bool


@router.get("", response_model=List[AccountResponse])
def list_accounts():
    """Returns the available Instagram accounts for carousel publishing."""
    accounts = get_configured_accounts()
    return [
        AccountResponse(
            id=acc.id,
            name=acc.name,
            handle=acc.handle,
            description=acc.description,
            has_webhook=bool(acc.webhook_url),
        )
        for acc in accounts
    ]
