import sys
from io import BytesIO
from PIL import Image

Image.MAX_IMAGE_PIXELS = 20_000_000

try:
    data = sys.stdin.buffer.read(10 * 1024 * 1024 + 1)
    with Image.open(BytesIO(data), formats=("JPEG", "PNG")) as photo:
        if photo.width * photo.height > Image.MAX_IMAGE_PIXELS:
            raise ValueError("Image exceeds the pixel limit")
        photo.verify()
    with Image.open(BytesIO(data), formats=("JPEG", "PNG")) as photo:
        photo.load()
        print({"JPEG": "image/jpeg", "PNG": "image/png"}[photo.format])
except (OSError, ValueError, SyntaxError, Image.DecompressionBombError):
    sys.exit(1)
