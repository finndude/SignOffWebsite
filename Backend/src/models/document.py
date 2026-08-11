import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    filename = Column(String, nullable=False)  # original filename, shown in UI
    storage_key = Column(String, nullable=False)  # path/key inside the R2 bucket

    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # "pending" | "signed"
    status = Column(String, default="pending", nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])