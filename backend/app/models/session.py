"""Modèle ORM représentant une séance d'entraînement sportif animée par un coach."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Unicode, UnicodeText
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .exercise import Exercise
    from .participation import Participation
    from .user import User
    from .reminder import SessionReminder
    from .waitlist import WaitlistEntry


class Session(Base):
    """Séance de sport (titre, horaire, durée, capacité) organisée par un coach,
    regroupant des exercices et des participations.
    """

    __tablename__ = "sport_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Unicode(150))
    description: Mapped[str | None] = mapped_column(UnicodeText, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_minutes: Mapped[int] = mapped_column(default=60)
    capacity: Mapped[int] = mapped_column(default=20)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    coach: Mapped["User"] = relationship(back_populates="sessions")
    exercises: Mapped[list["Exercise"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    participations: Mapped[list["Participation"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    # File d'attente dans l'ordre d'arrivée (id croissant).
    waitlist: Mapped[list["WaitlistEntry"]] = relationship(back_populates="session", cascade="all, delete-orphan", order_by="WaitlistEntry.id")
    # Rappels déjà envoyés : supprimés avec la séance.
    reminders: Mapped[list["SessionReminder"]] = relationship(back_populates="session", cascade="all, delete-orphan")

    @property
    def coach_name(self) -> str:
        """Nom complet du coach qui anime la séance, exposé aux schémas de lecture."""
        return self.coach.full_name

    @property
    def registered_count(self) -> int:
        """Nombre d'inscriptions (toutes statuts confondus) à la séance, pour afficher les places restantes."""
        return len(self.participations)

    @property
    def waitlist_count(self) -> int:
        """Nombre de sportifs en liste d'attente, affiché sur une séance complète."""
        return len(self.waitlist)
