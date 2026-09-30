"""Modèle ORM représentant un objectif personnel fixé par un utilisateur (ex: atteindre
une certaine valeur pour une métrique donnée avant une échéance)."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Unicode, UnicodeText
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base
from ..services.time import utc_now_naive


class Goal(Base):
    """Objectif d'un utilisateur : métrique suivie, valeur cible/actuelle et échéance."""

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(Unicode(120))
    metric: Mapped[str] = mapped_column(Unicode(40))
    target_value: Mapped[float] = mapped_column()
    current_value: Mapped[float] = mapped_column(default=0)
    unit: Mapped[str] = mapped_column(Unicode(20))
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(UnicodeText, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now_naive)

    @property
    def auto_progress(self) -> bool:
        """Objectif compté en séances : sa progression suit les présences (voir services/goals.py)."""
        return self.unit.strip().lower().startswith("séance")
