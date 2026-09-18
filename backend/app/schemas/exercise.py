"""Schémas Pydantic pour la création et la lecture des exercices d'une séance."""

from pydantic import BaseModel, ConfigDict, Field


class ExerciseCreate(BaseModel):
    """Données requises pour créer un exercice."""

    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    sets: int = Field(gt=0, le=30)
    repetitions: int | None = Field(default=None, gt=0, le=500)
    rest_seconds: int = Field(default=90, ge=0, le=3600)


class ExerciseRead(ExerciseCreate):
    """Représentation complète d'un exercice retournée par l'API."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
