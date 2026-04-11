from io import BytesIO
from pathlib import Path
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from ...core.cloudinary import upload_image, upload_video
from ...core.config import settings
from ...core.image_webp import raster_image_to_webp

router = APIRouter(tags=["Uploads"])

RASTER_IMAGE_EXTENSIONS = frozenset(
    {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"}
)


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
):
    """Upload a file (images are converted to WebP before storage)."""
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not allowed. Allowed types: {settings.ALLOWED_EXTENSIONS}",
        )

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE / (1024 * 1024)}MB",
        )

    if file_ext in RASTER_IMAGE_EXTENSIONS:
        try:
            webp_buf = raster_image_to_webp(content)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            ) from e

        webp_size = webp_buf.getbuffer().nbytes
        url = upload_image(webp_buf, folder="logiclab/images")
        if url:
            return {
                "message": "Image uploaded successfully to Cloudinary (WebP)",
                "url": url,
                "filename": f"{Path(file.filename or 'image').stem}.webp",
                "size": webp_size,
            }

        unique_filename = f"{uuid.uuid4()}.webp"
        file_path = Path(settings.UPLOAD_DIR) / unique_filename
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

    if file_ext in {".mp4"}:
        url = upload_video(BytesIO(content), folder="logiclab/videos")
        if url:
            return {
                "message": "Video uploaded successfully to Cloudinary",
                "url": url,
                "filename": file.filename,
                "size": len(content),
            }

    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = Path(settings.UPLOAD_DIR) / unique_filename

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
