"""Fonctions utilitaires de manipulation des dates/heures."""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from ..config import get_settings


def is_past(value: datetime) -> bool:
    """Indique si une date/heure donnée est déjà passée par rapport à maintenant (UTC).
    Les valeurs naïves (sans fuseau) sont supposées être en UTC.
    """
    normalized = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return normalized <= datetime.now(timezone.utc)


def utc_now() -> datetime:
    """Date/heure courante en UTC, avec fuseau (remplace datetime.utcnow(), déprécié)."""
    return datetime.now(timezone.utc)


def utc_now_naive() -> datetime:
    """Date/heure courante en UTC sans fuseau, pour les colonnes DateTime sans fuseau
    (même valeur que l'ancien datetime.utcnow())."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def local_datetime_label(value: datetime) -> str:
    """Date et heure lisibles dans le fuseau de l'application (APP_TIMEZONE, Europe/Paris par
    défaut), ex. « 08/10/2026 à 17:32 ». Utilisée dans les notifications : les dates sont
    stockées en UTC, les écrire telles quelles décalerait l'heure affichée au sportif."""
    normalized = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return normalized.astimezone(ZoneInfo(get_settings().app_timezone)).strftime("%d/%m/%Y à %H:%M")
