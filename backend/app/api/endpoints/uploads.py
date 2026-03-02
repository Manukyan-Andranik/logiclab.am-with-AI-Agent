from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pathlib import Path
import uuid
import shutil

from ...core.config import settings
from ...core.cloudinary import upload_image, upload_video
from ..deps import get_db

router = APIRouter(tags=["Uploads"])

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a file (images, videos, PDFs, etc.)"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not allowed. Allowed types: {settings.ALLOWED_EXTENSIONS}"
        )

    # Check file size (basic check)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    # Increase limit for videos if needed, currently 10MB from settings
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
        )

    # Route to Cloudinary if it's an image or video
    if file_ext in {".jpg", ".jpeg", ".png", ".gif"}:
        url = upload_image(file.file, folder="logiclab/images")
        if url:
            return {
                "message": "Image uploaded successfully to Cloudinary",
                "url": url,
                "filename": file.filename,
                "size": file_size
            }
    elif file_ext in {".mp4"}:
        url = upload_video(file.file, folder="logiclab/videos")
        if url:
            return {
                "message": "Video uploaded successfully to Cloudinary",
                "url": url,
                "filename": file.filename,
                "size": file_size
            }

    # Fallback to local storage for other types or if Cloudinary failed/not configured
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = Path(settings.UPLOAD_DIR) / unique_filename

    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

    # Return file URL
    file_url = f"/uploads/{unique_filename}"

    return {
        "message": "File uploaded successfully to local storage",
        "filename": unique_filename,
        "url": file_url,
        "size": file_size
    }