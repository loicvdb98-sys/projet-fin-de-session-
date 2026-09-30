"""Objectifs comptés en séances : leur progression est tenue à jour automatiquement à partir
des présences pointées par le coach, au lieu d'être saisie à la main."""

from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models.goal import Goal
from ..models.participation import Participation
from ..models.session import Session as SportSession
from .time import local_date


def is_session_goal(goal: Goal) -> bool:
    """Objectif dont l'unité est « séance(s) » : sa valeur actuelle vient des présences."""
    return goal.unit.strip().lower().startswith("séance")


def session_goal_window(goal: Goal, now: datetime) -> tuple[datetime, datetime]:
    """Période comptée (en UTC) : du 1er du mois où l'objectif a été créé (00 h, heure locale)
    jusqu'à la fin du jour d'échéance, sans dépasser l'instant présent."""
    zone = ZoneInfo(get_settings().app_timezone)
    first_day = local_date(goal.created_at).replace(day=1)
    start = datetime.combine(first_day, time.min, zone).astimezone(timezone.utc)
    end = now
    if goal.due_date:
        end = min(now, datetime.combine(goal.due_date, time.max, zone).astimezone(timezone.utc))
    return start, end


def sync_session_goals(db: Session, user_id: int, now: datetime | None = None) -> None:
    """Recalcule les objectifs en séances de l'utilisateur (présences sur la période de chaque
    objectif) et enregistre ceux qui ont changé."""
    now = now or datetime.now(timezone.utc)
    changed = False
    for goal in db.scalars(select(Goal).where(Goal.user_id == user_id)):
        if not is_session_goal(goal):
            continue
        start, end = session_goal_window(goal, now)
        attended = db.scalar(
            select(func.count(Participation.id))
            .join(SportSession, Participation.session_id == SportSession.id)
            .where(Participation.user_id == user_id, Participation.status == "present", SportSession.starts_at >= start, SportSession.starts_at <= end)
        ) or 0
        if goal.current_value != attended:
            goal.current_value = attended
            changed = True
    if changed:
        db.commit()
