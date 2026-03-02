import cloudinary
import cloudinary.uploader
from .config import settings

# Configure Cloudinary
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

def upload_image(file, folder="logiclab"):
    """
    Upload an image to Cloudinary and return the secure URL.
    """
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        # Fallback if Cloudinary is not configured (for development/testing)
        # In a real scenario, you might want to save to local storage instead
        return None

    try:
        upload_result = cloudinary.uploader.upload(file, folder=folder)
        return upload_result.get("secure_url")
    except Exception as e:
        print(f"Error uploading to Cloudinary: {e}")
        return None

def upload_video(file, folder="hero"):
    """
    Upload a video to Cloudinary and return the secure URL.
    """
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        return None

    try:
        # Use resource_type="video" for video uploads
        upload_result = cloudinary.uploader.upload(
            file, 
            folder=folder,
            resource_type="video"
        )
        return upload_result.get("secure_url")
    except Exception as e:
        print(f"Error uploading video to Cloudinary: {e}")
        return None

def delete_image(public_id):
    """
    Delete an image from Cloudinary.
    """
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        return False

    try:
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception as e:
        print(f"Error deleting from Cloudinary: {e}")
        return False
