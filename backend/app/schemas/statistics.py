"""Schéma Pydantic pour les statistiques agrégées retournées par l'API."""

from pydantic import BaseModel


class StatisticsRead(BaseModel):
    """Statistiques agrégées d'un utilisateur (séances, participations, performances)."""

    total_sessions: int
    upcoming_sessions: int
    total_participations: int
    attended_sessions: int
    total_performances: int
    average_score: float | None
