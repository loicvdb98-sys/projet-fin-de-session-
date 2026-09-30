"""Schémas Pydantic pour les séances d'entraînement."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SessionBase(BaseModel):
    """Champs communs décrivant une séance."""

    title: str = Field(min_length=1, max_length=150)
    description: str | None = None
    starts_at: datetime
    duration_minutes: int = Field(default=60, gt=0)
    capacity: int = Field(default=20, gt=0)


class SessionCreate(SessionBase):
    """Données requises pour créer une séance, avec le coach qui l'anime."""

    coach_id: int


class SessionUpdate(BaseModel):
    """Champs modifiables d'une séance existante, tous optionnels."""

    title: str | None = None
    description: str | None = None
    starts_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, gt=0)
    capacity: int | None = Field(default=None, gt=0)


class SessionDuplicate(BaseModel):
    """Décalage de la copie d'une séance, en jours. Sans valeur : même jour et même heure la
    semaine suivante (ou la première semaine à venir, si la séance d'origine est passée)."""

    days: int | None = Field(default=None, ge=1, le=365)


class SessionRepeat(BaseModel):
    """Nombre de semaines suivantes à planifier (1 à 12), au même jour et à la même heure."""

    weeks: int = Field(ge=1, le=12)


class SessionRead(SessionBase):
    """Représentation complète d'une séance retournée par l'API."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    coach_id: int
    coach_name: str
    registered_count: int
    waitlist_count: int = 0
