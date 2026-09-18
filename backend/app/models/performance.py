"""Modèle ORM représentant la performance (score) réalisée par un utilisateur lors d'une séance."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .session import Session
    from .user import User


class Performance(Base):
    """Score enregistré pour un utilisateur sur une séance donnée, avec notes optionnelles."""

    __tablename__ = "performances"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    session_id: Mapped[int] = mapped_column(ForeignKey("sport_sessions.id"))
    score: Mapped[float] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    user: Mapped["User"] = relationship()
    session: Mapped["Session"] = relationship()
