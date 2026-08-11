import io
import re
import uuid

import boto3
from pypdf import PdfReader, PdfWriter
from PIL import Image
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from src.config import settings


def _extract_region_from_endpoint(endpoint: str) -> str:
    """
    Backblaze B2 endpoints look like:
    https://s3.us-west-004.backblazeb2.com

    boto3 needs the real region ('us-west-004'), not 'auto'.

    Falls back to 'auto' for providers such as R2 that don't encode
    a region in the endpoint.
    """
    match = re.search(
        r"s3\.([a-z0-9-]+)\.backblazeb2\.com",
        endpoint,
    )

    return match.group(1) if match else "auto"


s3_client = boto3.client(
    "s3",
    endpoint_url=settings.storage_endpoint,
    aws_access_key_id=settings.storage_access_key_id,
    aws_secret_access_key=settings.storage_secret_access_key,
    region_name=_extract_region_from_endpoint(
        settings.storage_endpoint
    ),
)


def upload_file_to_storage(
    file_bytes: bytes,
    original_filename: str,
    content_type: str,
) -> str:
    """
    Uploads a file to storage and returns its storage key.
    """
    extension = (
        original_filename.rsplit(".", 1)[-1]
        if "." in original_filename
        else "pdf"
    )

    storage_key = f"documents/{uuid.uuid4()}.{extension}"

    s3_client.put_object(
        Bucket=settings.storage_bucket_name,
        Key=storage_key,
        Body=file_bytes,
        ContentType=content_type,
    )

    return storage_key


def upload_signature_to_storage(
    image_bytes: bytes,
) -> str:
    """
    Stores the original drawn signature as a PNG.

    This is kept separately from the signed PDF so the original
    signature image can still be retained for audit purposes.
    """
    storage_key = f"signatures/{uuid.uuid4()}.png"

    s3_client.put_object(
        Bucket=settings.storage_bucket_name,
        Key=storage_key,
        Body=image_bytes,
        ContentType="image/png",
    )

    return storage_key


def overwrite_file_in_storage(
    storage_key: str,
    file_bytes: bytes,
    content_type: str = "application/pdf",
) -> None:
    """
    Overwrites an existing object using the same storage key.

    This means the signed PDF replaces the original PDF rather
    than creating a second document.
    """
    s3_client.put_object(
        Bucket=settings.storage_bucket_name,
        Key=storage_key,
        Body=file_bytes,
        ContentType=content_type,
    )


def get_download_url(
    storage_key: str,
    expires_in_seconds: int = 3600,
) -> str:
    """
    Generates a temporary signed URL for a private storage object.
    """
    return s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.storage_bucket_name,
            "Key": storage_key,
        },
        ExpiresIn=expires_in_seconds,
    )


def get_file_from_storage(storage_key: str):
    """
    Opens a private object from storage so the API can stream it
    to the browser.
    """
    return s3_client.get_object(
        Bucket=settings.storage_bucket_name,
        Key=storage_key,
    )


def _create_signature_overlay(
    signature_bytes: bytes,
    width: float,
    height: float,
) -> bytes:
    """
    Creates a small temporary PDF containing the signature image.

    The resulting PDF page has exactly the requested signature
    dimensions.
    """
    signature_image = Image.open(
        io.BytesIO(signature_bytes)
    ).convert("RGBA")

    overlay_buffer = io.BytesIO()

    signature_canvas = canvas.Canvas(
        overlay_buffer,
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

    overlay_buffer.seek(0)

    return overlay_buffer.getvalue()


def stamp_signatures_on_pdf(
    pdf_bytes: bytes,
    signature_bytes: bytes,
    signatures: list,
) -> bytes:
    """
    Stamps multiple signatures onto a PDF.

    Each signature placement contains:

        page_number
        x
        y
        width
        height
        page_width
        page_height

    The frontend coordinates are based on the rendered PDF canvas.

    The PDF itself uses points and has its origin at the bottom-left,
    so the frontend coordinates are converted before stamping.
    """

    reader = PdfReader(
        io.BytesIO(pdf_bytes)
    )

    writer = PdfWriter()

    if not signatures:
        raise ValueError(
            "At least one signature placement is required."
        )

    # ---------------------------------------------------------
    # Create an overlay for every signature.
    # ---------------------------------------------------------

    overlays = []

    for signature in signatures:
        page_number = signature.page_number

        if (
            page_number < 0
            or page_number >= len(reader.pages)
        ):
            raise ValueError(
                f"Invalid PDF page number: {page_number}"
            )

        pdf_page = reader.pages[page_number]

        # Actual PDF page dimensions in points.
        pdf_width = float(
            pdf_page.mediabox.width
        )

        pdf_height = float(
            pdf_page.mediabox.height
        )

        # Dimensions of the page as rendered in the browser.
        rendered_width = float(
            signature.page_width
        )

        rendered_height = float(
            signature.page_height
        )

        if rendered_width <= 0 or rendered_height <= 0:
            raise ValueError(
                "Invalid rendered page dimensions."
            )

        # Scale browser coordinates into PDF points.
        scale_x = (
            pdf_width / rendered_width
        )

        scale_y = (
            pdf_height / rendered_height
        )

        # Frontend X/Y are top-left based.
        #
        # PDF X/Y are bottom-left based.
        pdf_x = (
            float(signature.x) * scale_x
        )

        signature_width = (
            float(signature.width) * scale_x
        )

        signature_height = (
            float(signature.height) * scale_y
        )

        # Convert top-left Y into bottom-left PDF Y.
        pdf_y = (
            pdf_height
            - (
                float(signature.y)
                + float(signature.height)
            )
            * scale_y
        )

        # Create temporary PDF containing the signature.
        overlay_bytes = _create_signature_overlay(
            signature_bytes,
            signature_width,
            signature_height,
        )

        overlay_reader = PdfReader(
            io.BytesIO(overlay_bytes)
        )

        overlay_page = overlay_reader.pages[0]

        # Move the signature overlay to the desired
        # position on the actual PDF page.
        overlay_page.translate(
            pdf_x,
            pdf_y,
        )

        overlays.append(
            (
                page_number,
                overlay_page,
            )
        )

    # ---------------------------------------------------------
    # Apply every signature to its corresponding page.
    # ---------------------------------------------------------

    for page_number, page in enumerate(
        reader.pages
    ):
        page_overlays = [
            overlay
            for overlay_page_number, overlay
            in overlays
            if overlay_page_number
            == page_number
        ]

        for overlay_page in page_overlays:
            page.merge_page(
                overlay_page
            )

        writer.add_page(page)

    # ---------------------------------------------------------
    # Write final PDF.
    # ---------------------------------------------------------

    output = io.BytesIO()

    writer.write(output)

    return output.getvalue()