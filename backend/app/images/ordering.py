from typing import List, Dict, Any
from pydantic import BaseModel, Field


class OrderedImageItem(BaseModel):
    order: int = Field(..., ge=1, description="1-indexed carousel sequence position")
    filename: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


def validate_carousel_order(items: List[OrderedImageItem]) -> tuple[bool, str | None]:
    """
    Validates that a carousel image list has:
    1. Between 2 and 10 images (Instagram carousel constraint).
    2. Explicit contiguous 1-indexed order (1, 2, 3... N).
    3. No duplicate order indices.
    """
    count = len(items)
    if count < 2:
        return False, f"Instagram carousel requires at least 2 images, but {count} was provided."
    if count > 10:
        return False, f"Instagram carousel allows at most 10 images, but {count} were provided."

    seen_orders = set()
    for item in items:
        if item.order in seen_orders:
            return False, f"Duplicate order index '{item.order}' detected."
        seen_orders.add(item.order)

    expected_orders = set(range(1, count + 1))
    if seen_orders != expected_orders:
        return False, f"Order indices must be contiguous from 1 to {count}. Received: {sorted(seen_orders)}"

    return True, None
