"""Fonctions utilitaires de manipulation des dates/heures."""

from datetime import datetime, timezone


def is_past(value: datetime) -> bool:
    """Indique si une date/heure donnée est déjà passée par rapport à maintenant (UTC).
    Les valeurs naïves (sans fuseau) sont supposées être en UTC.
    """
    normalized = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return normalized <= datetime.now(timezone.utc)
