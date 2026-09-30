"""Rappels automatiques : chaque inscrit (hors absents) d'une séance qui commence dans les
24 prochaines heures reçoit une notification, et un email si un serveur SMTP est configuré.
Chaque sportif n'est prévenu qu'une fois par séance (table session_reminders)."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models.notification import Notification
from ..models.participation import Participation
from ..models.reminder import SessionReminder
from ..models.session import Session as SportSession
from ..models.user import User
from .email import send_email
from .time import local_date, local_datetime_label

logger = logging.getLogger(__name__)

REMINDER_LEAD = timedelta(hours=24)


def _when(starts_at: datetime, now: datetime) -> str:
    """« aujourd'hui à 18:32 » ou « demain à 18:32 » (jour et heure dans le fuseau de l'application)."""
    hour = local_datetime_label(starts_at).split(" à ")[1]
    return f"aujourd'hui à {hour}" if local_date(starts_at) == local_date(now) else f"demain à {hour}"


def send_due_reminders(db: Session, now: datetime | None = None) -> int:
    """Envoie les rappels dus et retourne leur nombre (avec commit)."""
    now = now or datetime.now(timezone.utc)
    already_sent = exists().where(SessionReminder.user_id == Participation.user_id, SessionReminder.session_id == Participation.session_id)
    rows = db.execute(
        select(Participation.user_id, SportSession, User)
        .join(SportSession, Participation.session_id == SportSession.id)
        .join(User, Participation.user_id == User.id)
        .where(
            SportSession.starts_at > now,
            SportSession.starts_at <= now + REMINDER_LEAD,
            Participation.status != "absent",
            User.is_active == True,  # noqa: E712 (SQL Server refuse « IS 1 »)
            ~already_sent,
        )
    ).all()
    emails: list[tuple[str, str, str]] = []
    for user_id, session, user in rows:
        when = _when(session.starts_at, now)
        db.add(SessionReminder(user_id=user_id, session_id=session.id))
        db.add(Notification(user_id=user_id, title=f"Rappel : {session.title} {when}"[:120], message=f"Votre séance « {session.title} » commence {when} ({session.duration_minutes} min, coach : {session.coach_name}).", kind="info"))
        emails.append((user.email, f"SportPlan : rappel de votre séance {when}", f"Bonjour {user.full_name},\n\nVotre séance « {session.title} » commence {when} ({session.duration_minutes} min, coach : {session.coach_name}).\n\nÀ bientôt sur SportPlan !"))
    db.commit()
    # Sans serveur SMTP, la notification suffit : inutile d'écrire chaque email dans le journal.
    if get_settings().smtp_host:
        for to, subject, body in emails:
            send_email(to, subject, body)
    if rows:
        logger.info("%s rappel(s) de séance envoyé(s)", len(rows))
    return len(rows)
