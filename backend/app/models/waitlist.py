"""Modèle ORM de la liste d'attente d'une séance complète."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from ..services.time import utc_now

if TYPE_CHECKING:
    from .session import Session
    from .user import User


class WaitlistEntry(Base):
    """Demande d'un sportif à être inscrit dès qu'une place se libère sur une séance complète.
    L'ordre d'arrivée (id croissant) donne la position dans la file.
    """

    __tablename__ = "waitlist_entries"
    # Une seule place dans la file par sportif et par séance.
    __table_args__ = (Index("ux_waitlist_user_session", "user_id", "session_id", unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sport_sessions.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session: Mapped["Session"] = relationship(back_populates="waitlist")
    user: Mapped["User"] = relationship()
