import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    title = Column(String(120), default="Untitled upload", nullable=False)

    # "pending" until every document inside it is signed, then "signed"
    status = Column(String, default="pending", nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    documents = relationship("Document", back_populates="assignment", cascade="all, delete-orphan")
