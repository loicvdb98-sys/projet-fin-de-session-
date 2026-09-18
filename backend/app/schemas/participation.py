"""Schémas Pydantic pour l'inscription des utilisateurs aux séances (participations)."""

from pydantic import BaseModel, ConfigDict


class ParticipationCreate(BaseModel):
    """Données requises pour inscrire un utilisateur à une séance."""

    user_id: int
    session_id: int


class ParticipationUpdate(BaseModel):
    """Mise à jour du statut de présence d'une participation."""

    status: str


class ParticipationRead(BaseModel):
    """Représentation complète d'une participation retournée par l'API."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    session_id: int
    status: str
