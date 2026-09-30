"""Routeur FastAPI exposant les statistiques agrégées de l'utilisateur connecté
(séances, participations, performances), calculées différemment selon le rôle."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.goal import Goal
from ..models.journal import TrainingJournal
from ..models.participation import Participation
from ..models.performance import Performance
from ..models.record import PersonalRecord
from ..models.session import Session as SportSession
from ..models.user import User
from ..schemas.statistics import BadgeRead, BadgesRead, StatisticsRead
from ..services.badges import compute_badges
from ..services.goals import sync_session_goals
from ..services.time import local_date

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/me", response_model=StatisticsRead)
def my_statistics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Calcule les statistiques de l'utilisateur connecté (GET /statistics/me).
    Pour un coach/admin : statistiques sur les séances qu'il encadre (toutes séances pour un admin).
    Pour un sportif : statistiques sur ses propres participations et performances.
    """
    now = datetime.now(timezone.utc)
    # Chaque requête calcule plusieurs chiffres à la fois (COUNT conditionnels) : trois
    # requêtes au lieu de six.
    upcoming = func.count(case((SportSession.starts_at > now, 1)))
    present = func.count(case((Participation.status == "present", 1)))
    if user.role in {"coach", "admin"}:
        # `True` comme filtre neutralise le WHERE pour un admin (accès à toutes les séances).
        scope = True if user.role == "admin" else SportSession.coach_id == user.id
        total_sessions, upcoming_sessions = db.execute(select(func.count(SportSession.id), upcoming).where(scope)).one()
        total_participations, attended_sessions = db.execute(
            select(func.count(Participation.id), present).join(SportSession, Participation.session_id == SportSession.id).where(scope)
        ).one()
        # Même périmètre : les performances de ses séances pour un coach (et non toute la plateforme).
        performance_query = select(func.count(Performance.id), func.avg(Performance.score)).join(SportSession, Performance.session_id == SportSession.id).where(scope)
    else:
        # Pour un sportif, une « séance » est une de ses inscriptions.
        total_sessions, upcoming_sessions, attended_sessions = db.execute(
            select(func.count(Participation.id), upcoming, present)
            .join(SportSession, Participation.session_id == SportSession.id)
            .where(Participation.user_id == user.id)
        ).one()
        total_participations = total_sessions
        performance_query = select(func.count(Performance.id), func.avg(Performance.score)).where(Performance.user_id == user.id)
    total_performances, average_score = db.execute(performance_query).one()
    return StatisticsRead(
        total_sessions=total_sessions,
        upcoming_sessions=upcoming_sessions,
        total_participations=total_participations,
        attended_sessions=attended_sessions,
        total_performances=total_performances,
        average_score=round(float(average_score), 2) if average_score is not None else None,
    )


@router.get("/badges", response_model=BadgesRead)
def my_badges(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Badges de l'utilisateur connecté et sa série de semaines d'entraînement (GET /statistics/badges) :
    présences (1, 10, 25, 5 de suite), 4 semaines d'affilée, objectif atteint, record, 5 bilans de journal.
    """
    now = datetime.now(timezone.utc)
    sync_session_goals(db, user.id, now)
    rows = db.execute(
        select(SportSession.starts_at, Participation.status)
        .join(SportSession, Participation.session_id == SportSession.id)
        .where(Participation.user_id == user.id, SportSession.starts_at <= now)
        .order_by(SportSession.starts_at)
    ).all()
    goals_completed = db.scalar(
        select(func.count(Goal.id)).where(Goal.user_id == user.id, Goal.target_value > 0, Goal.current_value >= Goal.target_value)
    ) or 0
    record_days = [local_date(day) for day in db.scalars(select(PersonalRecord.achieved_at).where(PersonalRecord.user_id == user.id))]
    journal_days = [local_date(day) for day in db.scalars(select(TrainingJournal.created_at).where(TrainingJournal.user_id == user.id))]
    badges, current, best = compute_badges(
        [(local_date(starts_at), status) for starts_at, status in rows], goals_completed, record_days, journal_days, local_date(now)
    )
    return BadgesRead(
        current_streak_weeks=current,
        best_streak_weeks=best,
        earned_count=sum(badge.earned for badge in badges),
        badges=[
            BadgeRead(code=badge.code, title=badge.title, description=badge.description, earned=badge.earned,
                      progress=min(badge.progress, badge.target), target=badge.target, earned_at=badge.earned_at if badge.earned else None)
            for badge in badges
        ],
    )
