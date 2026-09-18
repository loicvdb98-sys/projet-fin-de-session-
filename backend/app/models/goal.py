"""Modèle ORM représentant un objectif personnel fixé par un utilisateur (ex: atteindre
une certaine valeur pour une métrique donnée avant une échéance)."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Goal(Base):
    """Objectif d'un utilisateur : métrique suivie, valeur cible/actuelle et échéance."""

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    metric: Mapped[str] = mapped_column(String(40))
    target_value: Mapped[float] = mapped_column()
    current_value: Mapped[float] = mapped_column(default=0)
    unit: Mapped[str] = mapped_column(String(20))
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
