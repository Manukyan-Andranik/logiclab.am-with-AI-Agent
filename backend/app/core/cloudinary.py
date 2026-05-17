import logging
import re
from typing import Iterable, List, Optional, Set, Tuple

import cloudinary
import cloudinary.uploader

from .config import settings

logger = logging.getLogger(__name__)

# Configure Cloudinary
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def _default_asset_urls() -> Set[str]:
    """Do not destroy shared default / stock URLs used by many users."""
    out: Set[str] = set()
    for u in (
        getattr(settings, "DEFAULT_PROFILE_IMAGE", None),
        getattr(settings, "DEFAULT_PROJECT_IMAGE", None),
        getattr(settings, "DEFAULT_COURSE_ICON", None),
    ):
        if u:
            out.add(u.strip())
    return out


def parse_cloudinary_delivery_url(url: str) -> Optional[Tuple[str, str]]:
    """
    Parse a res.cloudinary.com delivery URL into (public_id, resource_type)
    for cloudinary.uploader.destroy(...).

    resource_type is one of: image, video, raw
    """
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if "res.cloudinary.com" not in url:
        return None

    m = re.search(r"res\.cloudinary\.com/([^/]+)/(image|video|raw)/upload/", url)
    if not m:
        return None

    cloud_in_url = m.group(1)
    resource_type = m.group(2)

    if settings.CLOUDINARY_CLOUD_NAME and cloud_in_url != settings.CLOUDINARY_CLOUD_NAME:
        return None

    idx = url.find("/upload/")
    tail = url[idx + len("/upload/") :].split("?")[0]
    segments = [s for s in tail.split("/") if s]
    i = 0
    while i < len(segments):
        seg = segments[i]
        if re.fullmatch(r"v\d+", seg):
            i += 1
            continue
        if "," in seg:
            i += 1
            continue
        break
    if i >= len(segments):
        return None

    rest = segments[i:]
    full_path = "/".join(rest)
    if not full_path:
        return None

    last = rest[-1]
    if "." in last:
        base_last = last.rsplit(".", 1)[0]
        rest = rest[:-1] + [base_last]
    public_id = "/".join(rest)
    if not public_id:
        return None

    return (public_id, resource_type)


def delete_cloudinary_by_url(url: Optional[str]) -> bool:
    """
    Delete a single asset from Cloudinary if URL belongs to this app's cloud.
    Returns True if skipped (non-Cloudinary, default asset, or unconfigured) or destroy attempted.
    """
    if not url or not isinstance(url, str):
        return True
    url = url.strip()
    if url in _default_asset_urls():
        return True

    if not (
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    ):
        return False

    parsed = parse_cloudinary_delivery_url(url)
    if not parsed:
        return True

    public_id, resource_type = parsed
    rt = resource_type if resource_type in ("image", "video", "raw") else "image"

    try:
        cloudinary.uploader.destroy(public_id, resource_type=rt, invalidate=True)
        return True
    except Exception as e:
        logger.warning("Error deleting from Cloudinary public_id=%s err=%s", public_id, e)
        return False


def delete_cloudinary_urls(urls: Optional[Iterable[str]]) -> None:
    if not urls:
        return
    for u in urls:
        if u:
            delete_cloudinary_by_url(u)


def delete_removed_cloudinary_urls(
    old_urls: Optional[List[str]], new_urls: Optional[List[str]]
) -> None:
    """Delete Cloudinary assets that were in old_urls but not in new_urls."""
    old_set = set(old_urls or [])
    new_set = set(new_urls or [])
    for u in old_set - new_set:
        delete_cloudinary_by_url(u)


def upload_image(file, folder="logiclab"):
    """
    Upload an image to Cloudinary and return the secure URL.
    """
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        return None

    try:
        upload_result = cloudinary.uploader.upload(file, folder=folder)
        return upload_result.get("secure_url")
    except Exception as e:
        logger.warning("Error uploading to Cloudinary: %s", e)
        return None


def upload_video(file, folder="hero"):
    """
    Upload a video to Cloudinary and return the secure URL.
    """
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        return None

    try:
        upload_result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="video",
        )
        return upload_result.get("secure_url")
    except Exception as e:
        logger.warning("Error uploading video to Cloudinary: %s", e)
        return None


def delete_image(public_id: str) -> bool:
    """
    Delete an image from Cloudinary by public_id (legacy helper).
    """
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        return False

    try:
        cloudinary.uploader.destroy(public_id, resource_type="image", invalidate=True)
        return True
    except Exception as e:
        logger.warning("Error deleting from Cloudinary: %s", e)
        return False
