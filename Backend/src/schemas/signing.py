from pydantic import BaseModel, Field


class SignDocumentRequest(BaseModel):
    signature_data_url: str

    page_number: int = Field(ge=0)

    x: float
    y: float

    width: float = Field(gt=0)
    height: float = Field(gt=0)