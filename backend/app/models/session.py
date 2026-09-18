"""Modèle ORM représentant une séance d'entraînement sportif animée par un coach."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .exercise import Exercise
    from .participation import Participation
    from .user import User


class Session(Base):
    """Séance de sport (titre, horaire, durée, capacité) organisée par un coach,
    regroupant des exercices et des participations.
    """

    __tablename__ = "sport_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int] = mapped_column(default=60)
    capacity: Mapped[int] = mapped_column(default=20)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    coach: Mapped["User"] = relationship(back_populates="sessions")
    exercises: Mapped[list["Exercise"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    participations: Mapped[list["Participation"]] = relationship(back_populates="session", cascade="all, delete-orphan")

    @property
    def coach_name(self) -> str:
        """Nom complet du coach qui anime la séance, exposé aux schémas de lecture."""
        return self.coach.full_name

    @property
    def registered_count(self) -> int:
        """Nombre d'inscriptions (toutes statuts confondus) à la séance, pour afficher les places restantes."""
        return len(self.participations)
