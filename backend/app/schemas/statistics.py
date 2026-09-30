"""Schéma Pydantic pour les statistiques agrégées retournées par l'API."""

from datetime import date

from pydantic import BaseModel


class StatisticsRead(BaseModel):
    """Statistiques agrégées d'un utilisateur (séances, participations, performances)."""

    total_sessions: int
    upcoming_sessions: int
    total_participations: int
    attended_sessions: int
    total_performances: int
    average_score: float | None


class BadgeRead(BaseModel):
    """Un badge : obtenu ou non, avec la progression vers son objectif."""

    code: str
    title: str
    description: str
    earned: bool
    progress: int
    target: int
    earned_at: date | None = None


class BadgesRead(BaseModel):
    """Badges de l'utilisateur et séries de semaines consécutives avec au moins une présence."""

    current_streak_weeks: int
    best_streak_weeks: int
    earned_count: int
    badges: list[BadgeRead]
