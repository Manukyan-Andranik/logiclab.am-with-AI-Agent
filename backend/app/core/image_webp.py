"""Convert uploaded raster images to WebP before storage (Cloudinary or local)."""
from io import BytesIO

from PIL import Image, UnidentifiedImageError

try:
    from pillow_heif import register_heif_opener
except ImportError:
    # HEIC/HEIF uploads require: pip install pillow-heif
    register_heif_opener = None


def raster_image_to_webp(data: bytes, *, quality: int = 85) -> BytesIO:
    """
    Decode image bytes (JPEG, PNG, GIF, WebP, HEIC/HEIF when pillow-heif is installed, etc.) and encode as WebP.

    Animated GIF/WebP: only the first frame is kept.

    Raises:
        ValueError: empty input, corrupt image, or encoding failure.
    """
    if not data:
        raise ValueError("Empty image file")

    # Ensure HEIF is registered if available
    if register_heif_opener:
        try:
            register_heif_opener()
        except Exception:
            pass

    try:
        with Image.open(BytesIO(data)) as im:
            if getattr(im, "is_animated", False):
                im.seek(0)
            if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                frame = im.convert("RGBA")
            elif im.mode == "RGB":
                frame = im
            else:
                frame = im.convert("RGB")

            out = BytesIO()
            frame.save(out, format="WEBP", quality=quality, method=6)
            out.seek(0)
            return out
    except UnidentifiedImageError as e:
        # Debugging: show the first 16 bytes in hex to see if it's really an image or something else (like an error page)
        header = data[:16].hex()
        raise ValueError(f"Unrecognized image format (header: {header})") from e
    except Exception as e:
        raise ValueError(f"Could not process image: {e}") from e
