"""Schémas Pydantic pour l'authentification : jetons JWT et changement de mot de passe."""

from pydantic import BaseModel, Field, field_validator

from .user import check_password_strength


class Token(BaseModel):
    """Paire de jetons JWT retournée après une connexion ou un rafraîchissement réussi."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Requête d'échange d'un refresh token contre une nouvelle paire de jetons."""

    refresh_token: str


class LogoutRequest(BaseModel):
    """Requête de déconnexion : refresh token à révoquer."""

    refresh_token: str


class PasswordChange(BaseModel):
    """Requête de changement de mot de passe (mot de passe actuel + nouveau)."""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)

    @field_validator("new_password")
    @classmethod
    def reject_weak_passwords(cls, value: str) -> str:
        """Le nouveau mot de passe suit la même politique qu'à l'inscription."""
        return check_password_strength(value)
