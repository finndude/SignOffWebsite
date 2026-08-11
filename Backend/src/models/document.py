import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id"), nullable=False)

    filename = Column(String, nullable=False)  # original filename, shown in UI
    storage_key = Column(String, nullable=False)  # PDF's path/key inside the bucket

    is_signed = Column(Boolean, default=False, nullable=False)
    signed_at = Column(DateTime, nullable=True)

    # Drawn signature image, stored separately — not yet stamped onto the
    # PDF itself. That's a follow-up step once this flow is working.
    signature_storage_key = Column(String, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    assignment = relationship("Assignment", back_populates="documents")