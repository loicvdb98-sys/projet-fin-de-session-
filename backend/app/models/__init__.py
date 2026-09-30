"""Regroupe et ré-exporte tous les modèles SQLAlchemy de l'application pour un import simplifié
(ex: `from app.models import User`) et pour garantir qu'ils sont tous enregistrés auprès de Base.
"""

from .audit import AuditEvent
from .exercise import Exercise
from .participation import Participation
from .performance import Performance
from .goal import Goal
from .record import PersonalRecord
from .program import WorkoutProgram
from .notification import Notification
from .password_reset import PasswordResetToken
from .journal import TrainingJournal
from .refresh_token import RefreshToken
from .reminder import SessionReminder
from .session import Session
from .user import User
from .waitlist import WaitlistEntry

__all__ = ["User", "Session", "Exercise", "Participation", "Performance", "RefreshToken", "Goal", "PersonalRecord", "WorkoutProgram", "Notification", "TrainingJournal", "WaitlistEntry", "PasswordResetToken", "AuditEvent", "SessionReminder"]
