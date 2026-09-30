"""Modèle ORM d'un lien de réinitialisation du mot de passe (« mot de passe oublié »)."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class PasswordResetToken(Base):
    """Jeton à usage unique envoyé par email pour choisir un nouveau mot de passe. Seule son
    empreinte SHA-256 est stockée ; il expire au bout de 30 minutes (voir la configuration).
    """

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def is_valid(self) -> bool:
        """Utilisable : jamais utilisé (ni remplacé par une demande plus récente) et non expiré."""
        expires_at = self.expires_at if self.expires_at.tzinfo else self.expires_at.replace(tzinfo=timezone.utc)
        return self.used_at is None and expires_at > datetime.now(timezone.utc)
