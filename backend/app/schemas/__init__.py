"""Regroupe et ré-exporte les schémas Pydantic les plus utilisés de l'application
pour un import simplifié."""

from .auth import Token, TokenRefresh
from .user import UserCreate, UserRead, UserUpdate
from .session import SessionCreate, SessionRead, SessionUpdate
from .participation import ParticipationCreate, ParticipationRead, ParticipationUpdate
from .performance import PerformanceCreate, PerformanceRead

__all__ = ["Token", "TokenRefresh", "UserCreate", "UserRead", "UserUpdate", "SessionCreate", "SessionRead", "SessionUpdate", "ParticipationCreate", "ParticipationRead", "ParticipationUpdate", "PerformanceCreate", "PerformanceRead"]
