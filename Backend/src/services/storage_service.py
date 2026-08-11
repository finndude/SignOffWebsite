import re
import uuid

import boto3

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