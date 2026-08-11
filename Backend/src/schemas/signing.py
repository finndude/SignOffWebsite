from pydantic import BaseModel


class SignDocumentRequest(BaseModel):
    # Base64-encoded PNG data URL from the signature pad,
    # e.g. "data:image/png;base64,iVBORw0KG..."
    signature_data_url: str