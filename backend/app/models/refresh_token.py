"""Modèle ORM représentant un jeton de rafraîchissement JWT stocké côté serveur,
permettant sa révocation (déconnexion, rotation des jetons)."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class RefreshToken(Base):
    """Jeton de rafraîchissement (stocké sous forme de hachage, jamais en clair) associé
    à un utilisateur, avec sa date d'expiration et une éventuelle date de révocation.
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user = relationship("User")

    @property
    def is_valid(self) -> bool:
        """Indique si le jeton est encore utilisable : non révoqué et non expiré."""
        # Les dates lues depuis certaines bases (SQL Server) peuvent revenir sans
        # fuseau horaire ; on les considère alors comme UTC pour la comparaison.
        expires_at = self.expires_at if self.expires_at.tzinfo else self.expires_at.replace(tzinfo=timezone.utc)
        return self.revoked_at is None and expires_at > datetime.now(timezone.utc)
