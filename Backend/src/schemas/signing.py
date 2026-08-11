from pydantic import BaseModel, Field


class SignaturePlacement(BaseModel):
    page_number: int = Field(ge=0)
    x: float = Field(ge=0)
    y: float = Field(ge=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    page_width: float = Field(gt=0)
    page_height: float = Field(gt=0)


class SignDocumentRequest(BaseModel):
    signature_data_url: str
    signatures: list[SignaturePlacement]