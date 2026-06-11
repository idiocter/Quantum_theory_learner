import re

import bleach
from django.core.exceptions import ValidationError

ALLOWED_UPLOAD_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB


def validate_image_upload(file):
    if file.content_type not in ALLOWED_UPLOAD_TYPES:
        raise ValidationError(f"Unsupported file type: {file.content_type}. Allowed: jpeg, png, webp, gif.")
    if file.size > MAX_UPLOAD_SIZE:
        raise ValidationError(f"File too large ({file.size} bytes). Maximum is {MAX_UPLOAD_SIZE} bytes.")
    # Sniff magic bytes
    header = file.read(12)
    file.seek(0)
    magic_signatures = {
        b"\xff\xd8\xff": "image/jpeg",
        b"\x89PNG\r\n\x1a\n": "image/png",
        b"RIFF": "image/webp",
        b"GIF87a": "image/gif",
        b"GIF89a": "image/gif",
    }
    matched = any(header.startswith(sig) for sig in magic_signatures)
    if not matched:
        raise ValidationError("File content does not match a valid image type.")


ALLOWED_HTML_TAGS = ["b", "i", "em", "strong", "code", "pre", "p", "br", "ul", "ol", "li"]
ALLOWED_HTML_ATTRS = {}


def sanitize_html(text: str) -> str:
    return bleach.clean(text, tags=ALLOWED_HTML_TAGS, attributes=ALLOWED_HTML_ATTRS, strip=True)


def validate_no_script(value: str):
    if re.search(r"<\s*script", value, re.IGNORECASE):
        raise ValidationError("Script tags are not allowed.")
