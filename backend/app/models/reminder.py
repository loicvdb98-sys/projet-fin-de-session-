"""Modèle ORM des rappels de séance déjà envoyés (un par sportif et par séance)."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from ..services.time import utc_now

if TYPE_CHECKING:
    from .session import Session


class SessionReminder(Base):
    """Trace qu'un sportif a déjà été prévenu d'une séance à venir : le rappel n'est envoyé
    qu'une fois, même si la vérification périodique repasse plusieurs fois."""

    __tablename__ = "session_reminders"
    __table_args__ = (Index("ux_reminder_user_session", "user_id", "session_id", unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sport_sessions.id"), index=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session: Mapped["Session"] = relationship(back_populates="reminders")
