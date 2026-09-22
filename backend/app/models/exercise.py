"""Modèle ORM représentant un exercice rattaché à une séance d'entraînement."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Unicode, UnicodeText
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .session import Session


class Exercise(Base):
    """Exercice (nom, séries, répétitions, temps de repos) appartenant à une séance."""

    __tablename__ = "exercises"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sport_sessions.id"))
    name: Mapped[str] = mapped_column(Unicode(150))
    description: Mapped[str | None] = mapped_column(UnicodeText, nullable=True)
    sets: Mapped[int | None] = mapped_column(Integer, nullable=True)
    repetitions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rest_seconds: Mapped[int] = mapped_column(Integer, default=90)
    session: Mapped["Session"] = relationship(back_populates="exercises")
