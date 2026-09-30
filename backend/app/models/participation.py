"""Modèle ORM représentant l'inscription (participation) d'un utilisateur à une séance."""

from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .session import Session
    from .user import User


class Participation(Base):
    """Lien entre un utilisateur et une séance, avec un statut de présence
    (inscrit / présent / absent).
    """

    __tablename__ = "participations"
    # Une seule inscription par sportif et par séance, garantie par la base elle-même
    # (deux clics simultanés ne peuvent pas créer de doublon).
    __table_args__ = (Index("ux_participations_user_session", "user_id", "session_id", unique=True),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sport_sessions.id"), index=True)
    status: Mapped[str] = mapped_column(Enum("inscrit", "present", "absent", name="participation_status"), default="inscrit")
    user: Mapped["User"] = relationship(back_populates="participations")
    session: Mapped["Session"] = relationship(back_populates="participations")
