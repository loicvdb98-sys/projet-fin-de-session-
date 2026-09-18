"""Schémas Pydantic pour les entrées du journal d'entraînement."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JournalCreate(BaseModel):
    """Données requises pour créer une entrée de journal (par le sportif ou le coach)."""

    session_id: int
    notes: str | None = Field(default=None, max_length=2000)
    fatigue: int = Field(default=5, ge=1, le=10)
    mood: str = Field(default="bien", min_length=2, max_length=30)
    pain: str | None = Field(default=None, max_length=255)


class JournalUpdate(BaseModel):
    """Champs modifiables d'une entrée de journal. Tous optionnels : seuls les champs
    fournis sont mis à jour (voir la logique de restriction par rôle dans le routeur).
    """

    notes: str | None = Field(default=None, max_length=2000)
    fatigue: int | None = Field(default=None, ge=1, le=10)
    mood: str | None = Field(default=None, min_length=2, max_length=30)
    pain: str | None = Field(default=None, max_length=255)
    coach_comment: str | None = Field(default=None, max_length=2000)


class JournalRead(BaseModel):
    """Représentation complète d'une entrée de journal retournée par l'API."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    session_id: int
    notes: str | None
    fatigue: int
    mood: str
    pain: str | None
    coach_comment: str | None
    created_at: datetime
    updated_at: datetime
