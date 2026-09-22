"""Modèle ORM représentant un record personnel atteint par un utilisateur pour un exercice donné."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Unicode
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class PersonalRecord(Base):
    """Record personnel : meilleure valeur atteinte par un utilisateur pour un exercice, à une date donnée."""

    __tablename__ = "personal_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    exercise_name: Mapped[str] = mapped_column(Unicode(120))
    value: Mapped[float] = mapped_column()
    unit: Mapped[str] = mapped_column(Unicode(20))
    achieved_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(Unicode(255), nullable=True)
