import hashlib
import re
from typing import List, Tuple


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    # Normalize consecutive whitespace and newlines
    normalized = re.sub(r"[ \t]+", " ", text.strip())
    return normalized


def compute_submission_fingerprint(
    image_bytes_list: List[bytes],
    caption: str | None = None,
    hashtags: str | None = None,
    account_id: str = "account_1",
) -> str:
    """
    Computes a deterministic SHA-256 fingerprint for duplicate submission protection:
    SHA-256( account_id + ordered_image_hashes + normalized_caption + normalized_hashtags )
    """
    hasher = hashlib.sha256()

    # 1. Scope fingerprint to target account
    hasher.update(f"account:{account_id}".encode("utf-8"))

    # 2. Hash each image in exact sequence order
    for idx, img_data in enumerate(image_bytes_list):
        img_hash = hashlib.sha256(img_data).hexdigest()
        hasher.update(f"img_{idx}:{img_hash}".encode("utf-8"))

    # 3. Add normalized caption
    norm_caption = normalize_text(caption)
    hasher.update(f"caption:{norm_caption}".encode("utf-8"))

    # 4. Add normalized hashtags
    norm_hashtags = normalize_text(hashtags)
    hasher.update(f"hashtags:{norm_hashtags}".encode("utf-8"))

    return hasher.hexdigest()
