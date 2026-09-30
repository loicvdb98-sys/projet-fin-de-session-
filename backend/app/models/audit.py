"""Modèle ORM du journal d'activité (événements de sécurité consultés par un admin)."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Unicode
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base
from ..services.time import utc_now


class AuditEvent(Base):
    """Événement de sécurité : connexion réussie ou refusée, compte bloqué, rôle modifié,
    compte désactivé, mot de passe changé ou réinitialisé, vol de jeton détecté…"""

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    action: Mapped[str] = mapped_column(String(40), index=True)
    # Auteur de l'action (vide pour une tentative de connexion sur un email inconnu).
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    # Compte concerné quand il diffère de l'auteur (ex. rôle modifié par un admin).
    target_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    details: Mapped[str | None] = mapped_column(Unicode(255), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
