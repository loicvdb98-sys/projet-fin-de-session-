"""Routeur FastAPI exposant les statistiques agrégées de l'utilisateur connecté
(séances, participations, performances), calculées différemment selon le rôle."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.participation import Participation
from ..models.performance import Performance
from ..models.session import Session as SportSession
from ..models.user import User
from ..schemas.statistics import StatisticsRead

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/me", response_model=StatisticsRead)
def my_statistics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Calcule les statistiques de l'utilisateur connecté (GET /statistics/me).
    Pour un coach/admin : statistiques sur les séances qu'il encadre (toutes séances pour un admin).
    Pour un sportif : statistiques sur ses propres participations et performances.
    """
    now = datetime.now(timezone.utc)
    if user.role in {"coach", "admin"}:
        # `True` comme filtre neutralise le WHERE pour un admin (accès à toutes les séances).
        session_filter = True if user.role == "admin" else SportSession.coach_id == user.id
        total_sessions = db.scalar(select(func.count(SportSession.id)).where(session_filter)) or 0
        upcoming_sessions = db.scalar(select(func.count(SportSession.id)).where(session_filter, SportSession.starts_at > now)) or 0
        participation_filter = True if user.role == "admin" else SportSession.coach_id == user.id
        participation_query = select(Participation).join(SportSession).where(participation_filter)
        performance_query = select(Performance).join(SportSession).where(participation_filter)
    else:
        total_sessions = db.scalar(select(func.count(Participation.id)).where(Participation.user_id == user.id)) or 0
        upcoming_sessions = db.scalar(
            select(func.count(Participation.id)).join(SportSession).where(
                Participation.user_id == user.id, SportSession.starts_at > now
            )
        ) or 0
        participation_query = select(Participation).where(Participation.user_id == user.id)
        performance_query = select(Performance).where(Performance.user_id == user.id)

    total_participations = db.scalar(select(func.count()).select_from(participation_query.subquery())) or 0
    attended_sessions = db.scalar(
        select(func.count()).select_from(participation_query.where(Participation.status == "present").subquery())
    ) or 0
    total_performances = db.scalar(select(func.count()).select_from(performance_query.subquery())) or 0
    average_score = db.scalar(select(func.avg(Performance.score)).where(
        Performance.user_id == user.id if user.role == "sportif" else True
    ))
    return StatisticsRead(
        total_sessions=total_sessions,
        upcoming_sessions=upcoming_sessions,
        total_participations=total_participations,
        attended_sessions=attended_sessions,
        total_performances=total_performances,
        average_score=round(float(average_score), 2) if average_score is not None else None,
    )
