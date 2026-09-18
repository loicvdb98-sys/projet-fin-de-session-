"""Schémas Pydantic pour les objectifs personnels et les records personnels des utilisateurs."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class GoalCreate(BaseModel):
    """Données requises pour créer ou mettre à jour un objectif."""

    title: str = Field(min_length=2, max_length=120)
    metric: str = Field(min_length=2, max_length=40)
    target_value: float = Field(gt=0)
    current_value: float = Field(default=0, ge=0)
    unit: str = Field(min_length=1, max_length=20)
    due_date: date | None = None
    notes: str | None = Field(default=None, max_length=500)


class GoalRead(GoalCreate):
    """Représentation complète d'un objectif retournée par l'API."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: datetime


class RecordCreate(BaseModel):
    """Données requises pour créer un record personnel."""

    exercise_name: str = Field(min_length=2, max_length=120)
    value: float = Field(gt=0)
    unit: str = Field(min_length=1, max_length=20)
    achieved_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=255)


class RecordRead(RecordCreate):
    """Représentation complète d'un record personnel retournée par l'API."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
