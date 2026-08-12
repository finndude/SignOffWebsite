import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name = Column(
        String,
        nullable=False,
    )

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password = Column(
        String,
        nullable=False,
    )

    # Admin-invite flow: True until the user sets their own password
    is_pending_activation = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    role = Column(
        String,
        default="assignee",
        nullable=False,
    )  # "admin" | "assignee"

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    # Assignments where this user is the signer.
    #
    # We do not rely on SQLAlchemy cascade here because assignments
    # also have a second relationship to User through assigned_by_id.
    # User deletion is handled explicitly in the admin route so that
    # all related storage files can be removed safely first.
    assigned_assignments = relationship(
        "Assignment",
        foreign_keys="Assignment.assigned_to_id",
        back_populates="assigned_to",
    )

    # Assignments created by this user/admin.
    created_assignments = relationship(
        "Assignment",
        foreign_keys="Assignment.assigned_by_id",
        back_populates="assigned_by",
    )