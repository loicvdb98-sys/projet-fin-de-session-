"""Modèle ORM représentant un programme d'entraînement personnalisé sur plusieurs semaines."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, Unicode, UnicodeText
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class WorkoutProgram(Base):
    """Programme d'entraînement d'un utilisateur : durée en semaines et plan de séances
    stocké en JSON (structure libre définie côté schémas/frontend).
    """

    __tablename__ = "workout_programs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(Unicode(120))
    description: Mapped[str | None] = mapped_column(UnicodeText, nullable=True)
    weeks: Mapped[int] = mapped_column(default=4)
    sessions: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
