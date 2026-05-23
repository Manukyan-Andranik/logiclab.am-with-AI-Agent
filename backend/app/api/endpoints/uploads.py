from io import BytesIO
from pathlib import Path
import uuid

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from ..deps import get_current_user
from ...core.rate_limit import rate_limit_upload
from ...core.cloudinary import upload_image, upload_video
from ...core.config import settings
from ...core.image_webp import raster_image_to_webp

router = APIRouter(tags=["Uploads"])

RASTER_IMAGE_EXTENSIONS = frozenset(
    {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".avif", ".bmp", ".tif", ".tiff"}
)

_ALLOWED_LOCAL_EXTENSIONS = frozenset(settings.ALLOWED_EXTENSIONS)


def _upload_root() -> Path:
    return Path(settings.UPLOAD_DIR).resolve()


def _safe_local_path(filename: str) -> Path:
    """Write only under UPLOAD_DIR; reject path traversal in filenames."""
    root = _upload_root()
    dest = (root / filename).resolve()
    if dest != root and root not in dest.parents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")
    return dest


def _store_webp_response(webp_buf: BytesIO, stem: str) -> dict:
    webp_size = webp_buf.getbuffer().nbytes
    webp_buf.seek(0)
    url = upload_image(webp_buf, folder="logiclab/images")
    webp_buf.seek(0)
    safe_stem = stem or "image"
    out_name = f"{safe_stem}.webp"
    if url:
        return {
            "message": "Image uploaded successfully to Cloudinary (WebP)",
            "url": url,
            "filename": out_name,
            "size": webp_size,
        }

    unique_filename = f"{uuid.uuid4()}.webp"
    file_path = _safe_local_path(unique_filename)
    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(webp_buf.getvalue())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        ) from e

    return {
        "message": "Image saved to local storage (WebP)",
        "filename": unique_filename,
        "url": f"/uploads/{unique_filename}",
        "size": webp_size,
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    _current_user=Depends(get_current_user),
    _rate_limit: Annotated[None, Depends(rate_limit_upload)] = None,
):
    """Upload a file (images are converted to WebP before storage)."""
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE / (1024 * 1024)}MB",
        )

    orig_name = file.filename or ""
    path_obj = Path(orig_name)
    file_ext = path_obj.suffix.lower()
    stem = path_obj.stem if orig_name else "image"
    if not stem:
        stem = "image"

    # Declared raster types (by extension)
    if file_ext in RASTER_IMAGE_EXTENSIONS:
        try:
            webp_buf = raster_image_to_webp(content)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            ) from e
        return _store_webp_response(webp_buf, stem)

    if file_ext == ".mp4":
        url = upload_video(BytesIO(content), folder="logiclab/videos")
        if url:
            return {
                "message": "Video uploaded successfully to Cloudinary",
                "url": url,
                "filename": file.filename,
                "size": len(content),
            }
        unique_filename = f"{uuid.uuid4()}.mp4"
        file_path = _safe_local_path(unique_filename)
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(e)}",
            ) from e
        return {
            "message": "Video saved to local storage",
            "filename": unique_filename,
            "url": f"/uploads/{unique_filename}",
            "size": len(content),
        }

    if file_ext in {".pdf", ".zip"}:
        if file_ext not in _ALLOWED_LOCAL_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} is not allowed",
            )
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = _safe_local_path(unique_filename)
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(e)}",
            ) from e
        return {
            "message": "File uploaded successfully to local storage",
            "filename": unique_filename,
            "url": f"/uploads/{unique_filename}",
            "size": len(content),
        }

    # No / unknown extension (common for multi-select from mobile) — try decode as image
    try:
        webp_buf = raster_image_to_webp(content)
    except ValueError:
        allowed = ", ".join(sorted(settings.ALLOWED_EXTENSIONS))
        hint = file_ext or "(no extension)"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File type {hint} is not allowed or could not be read as an image. "
                f"Allowed types: {allowed}"
            ),
        )

    return _store_webp_response(webp_buf, stem)
