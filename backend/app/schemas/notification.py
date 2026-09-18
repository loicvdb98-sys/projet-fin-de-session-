"""Schémas Pydantic pour la création et la lecture des notifications utilisateur."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    """Données requises pour créer une notification."""

    title: str = Field(min_length=2, max_length=120)
    message: str = Field(min_length=2, max_length=1000)
    kind: str = Field(default="info", max_length=20)


class NotificationRead(NotificationCreate):
    """Représentation complète d'une notification retournée par l'API."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
