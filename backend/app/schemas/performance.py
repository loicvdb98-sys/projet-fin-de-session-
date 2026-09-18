"""Schémas Pydantic pour les performances (scores) enregistrées lors des séances."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PerformanceCreate(BaseModel):
    """Données requises pour enregistrer une performance."""

    user_id: int
    session_id: int
    score: float = Field(ge=0)
    notes: str | None = None


class PerformanceRead(PerformanceCreate):
    """Représentation complète d'une performance retournée par l'API."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    recorded_at: datetime


class PerformanceUpdate(BaseModel):
    """Champs modifiables d'une performance existante."""

    score: float | None = Field(default=None, ge=0)
    notes: str | None = None
