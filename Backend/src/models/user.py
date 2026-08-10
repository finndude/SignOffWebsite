import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID

from src.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)

    # Admin-invite flow: True until the user sets their own password
    is_pending_activation = Column(Boolean, default=True, nullable=False)

    role = Column(String, default="assignee", nullable=False)  # "admin" | "assignee"

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))