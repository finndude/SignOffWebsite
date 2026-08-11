import io
import re
import uuid

import boto3
from pypdf import PdfReader, PdfWriter
from PIL import Image
from reportlab.lib.utils import ImageReader

from src.config import settings


def _extract_region_from_endpoint(endpoint: str) -> str:
    """
    Backblaze B2 endpoints look like https://s3.us-west-004.backblazeb2.com
    and boto3 needs the real region ('us-west-004'), not 'auto'.
    Falls back to 'auto' for providers (like R2) that don't encode a region.
    """
    match = re.search(r"s3\.([a-z0-9-]+)\.backblazeb2\.com", endpoint)
    return match.group(1) if match else "auto"


s3_client = boto3.client(
    "s3",
    endpoint_url=settings.storage_endpoint,
    aws_access_key_id=settings.storage_access_key_id,
    aws_secret_access_key=settings.storage_secret_access_key,
    region_name=_extract_region_from_endpoint(settings.storage_endpoint),
)


def upload_file_to_storage(file_bytes: bytes, original_filename: str, content_type: str) -> str:
    """
    Uploads a file to the R2 bucket and returns the storage key
    (not a public URL — R2 objects are private by default, we generate
    signed download URLs on demand instead, see get_download_url below).
    """
    extension = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "pdf"
    storage_key = f"documents/{uuid.uuid4()}.{extension}"

    s3_client.put_object(
        Bucket=settings.storage_bucket_name,
        Key=storage_key,
        Body=file_bytes,
        ContentType=content_type,
    )

    return storage_key


def upload_signature_to_storage(image_bytes: bytes) -> str:
    """Stores a drawn signature (PNG) uploaded from the signing screen."""
    storage_key = f"signatures/{uuid.uuid4()}.png"

    s3_client.put_object(
        Bucket=settings.storage_bucket_name,
        Key=storage_key,
        Body=image_bytes,
        ContentType="image/png",
    )

    return storage_key

def upload_signed_pdf_to_storage(pdf_bytes: bytes, storage_key: str) -> str:
    """
    Uploads the signed PDF back to the same storage location as the
    original document, replacing the unsigned version.
    """
    s3_client.put_object(
        Bucket=settings.storage_bucket_name,
        Key=storage_key,
        Body=pdf_bytes,
        ContentType="application/pdf",
    )

    return storage_key


def get_download_url(storage_key: str, expires_in_seconds: int = 3600) -> str:
    """
    Generates a temporary signed URL so the frontend can fetch/display
    a private file without the bucket needing to be public.
    """
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.storage_bucket_name, "Key": storage_key},
        ExpiresIn=expires_in_seconds,
    )


def get_file_from_storage(storage_key: str):
    """
    Opens a private object from storage so the API can stream it to the browser.
    This avoids requiring browser CORS rules on the Backblaze bucket for PDF preview.
    """
    return s3_client.get_object(
        Bucket=settings.storage_bucket_name,
        Key=storage_key,
    )

def stamp_signature_on_pdf(
    pdf_bytes: bytes,
    signature_bytes: bytes,
    page_number: int,
    x: float,
    y: float,
    width: float,
    height: float,
) -> bytes:
    """
    Places the signature image onto a specific PDF page.

    Coordinates are in PDF points, with (0, 0) at the bottom-left
    of the page.
    """

    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()

    if page_number < 0 or page_number >= len(reader.pages):
        raise ValueError("Invalid PDF page number.")

    # Create a temporary PDF containing the signature image.
    signature_image = Image.open(io.BytesIO(signature_bytes)).convert("RGBA")

    signature_pdf = io.BytesIO()

    # Create a PDF page sized to the requested signature dimensions.
    from reportlab.pdfgen import canvas

    signature_canvas = canvas.Canvas(
        signature_pdf,
        pagesize=(width, height),
    )

    signature_canvas.drawImage(
        ImageReader(signature_image),
        0,
        0,
        width=width,
        height=height,
        mask="auto",
    )

    signature_canvas.save()
    signature_pdf.seek(0)

    signature_reader = PdfReader(signature_pdf)
    signature_page = signature_reader.pages[0]

    # Position the signature on the requested page.
    signature_page.merge_page(
        reader.pages[page_number]
    )

    # Translate the signature page to the requested position.
    signature_page.mediabox.lower_left = (x, y)
    signature_page.mediabox.upper_right = (
        x + width,
        y + height,
    )

    for index, page in enumerate(reader.pages):
        if index == page_number:
            page.merge_page(signature_page)

        writer.add_page(page)

    output = io.BytesIO()
    writer.write(output)

    return output.getvalue()

def overwrite_file_in_storage(
    storage_key: str,
    file_bytes: bytes,
    content_type: str = "application/pdf",
) -> None:
    """
    Overwrites an existing object in storage using the same storage key.
    This is used when a signed PDF replaces the original PDF.
    """
    s3_client.put_object(
        Bucket=settings.storage_bucket_name,
        Key=storage_key,
        Body=file_bytes,
        ContentType=content_type,
    )