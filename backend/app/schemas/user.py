"""Schémas Pydantic pour les comptes utilisateurs."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Role = Literal["sportif", "coach", "admin"]
COMMON_PASSWORDS = {"password123456", "azerty123456", "qwerty123456"}


def check_password_strength(value: str) -> str:
    """Politique de mot de passe commune à l'inscription et au changement de mot de passe :
    pas de mot de passe courant ni d'espace, au moins une minuscule, une majuscule et un chiffre
    (la longueur, 12 à 128 caractères, est vérifiée par le champ lui-même).
    """
    if value.lower() in COMMON_PASSWORDS:
        raise ValueError("Mot de passe trop courant")
    if any(character.isspace() for character in value):
        raise ValueError("Le mot de passe ne doit pas contenir d'espaces")
    if not any(character.islower() for character in value):
        raise ValueError("Le mot de passe doit contenir une minuscule")
    if not any(character.isupper() for character in value):
        raise ValueError("Le mot de passe doit contenir une majuscule")
    if not any(character.isdigit() for character in value):
        raise ValueError("Le mot de passe doit contenir un chiffre")
    return value


def normalize_full_name(value: str) -> str:
    """Réduit les espaces multiples d'un nom et vérifie qu'il reste au moins 2 caractères."""
    normalized = " ".join(value.split())
    if len(normalized) < 2:
        raise ValueError("Le nom doit contenir au moins 2 caractères")
    return normalized


class UserCreate(BaseModel):
    """Données requises pour créer un compte utilisateur, avec validation renforcée
    de l'email, du nom et de la robustesse du mot de passe."""

    email: EmailStr = Field(description="Adresse email valide")
    full_name: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=12, max_length=128)
    role: str = "sportif"

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        """Normalise l'email (espaces retirés, minuscules) avant validation du format."""
        return value.strip().lower()

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        """Réduit les espaces multiples et vérifie une longueur minimale après normalisation."""
        return normalize_full_name(value)

    @field_validator("password")
    @classmethod
    def reject_weak_passwords(cls, value: str) -> str:
        """Rejette les mots de passe trop courants ou ne respectant pas la politique de complexité."""
        return check_password_strength(value)


class UserUpdate(BaseModel):
    """Champs modifiables d'un compte utilisateur (rôle et statut actif réservés à un admin,
    voir la logique du routeur)."""

    full_name: str | None = Field(default=None, max_length=150)
    role: Role | None = None
    is_active: bool | None = None

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        """Même règle qu'à l'inscription : un nom vide ou d'une lettre est refusé."""
        return normalize_full_name(value) if value is not None else None


class UserRead(BaseModel):
    """Représentation publique d'un utilisateur retournée par l'API (sans mot de passe)."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
