"""Modèle ORM représentant un utilisateur de l'application (coach, sportif ou admin)."""

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .participation import Participation
    from .session import Session


class User(Base):
    """Compte utilisateur : identité, mot de passe haché, rôle et statut actif/inactif."""

    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(Enum("coach", "sportif", "admin", name="user_roles"), default="sportif")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sessions: Mapped[list["Session"]] = relationship(back_populates="coach")
    participations: Mapped[list["Participation"]] = relationship(back_populates="user")
