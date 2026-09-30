"""Journal d'activité : enregistre les événements de sécurité pour la page « Journal d'activité »
de l'admin. Chaque événement est aussi écrit dans le journal de l'API (console)."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import Request
from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..models.audit import AuditEvent

logger = logging.getLogger("sportplan.audit")

# Actions enregistrées (le libellé français est affiché par le frontend).
ACTIONS = {
    "connexion", "connexion_refusee", "compte_bloque", "inscription", "deconnexion_partout",
    "mot_de_passe_change", "reinitialisation_demandee", "mot_de_passe_reinitialise",
    "vol_jeton_detecte", "role_modifie", "compte_desactive", "compte_reactive",
}
# Événements plus anciens supprimés au démarrage de l'API.
RETENTION = timedelta(days=180)


def client_ip(request: Request | None) -> str | None:
    """Adresse IP du client (celle de la connexion TCP ; derrière un proxy, il faudrait lire X-Forwarded-For)."""
    return request.client.host if request and request.client else None


def record(
    db: Session,
    action: str,
    actor_id: int | None = None,
    target_user_id: int | None = None,
    details: str | None = None,
    ip: str | None = None,
) -> None:
    """Ajoute un événement (sans commit : l'appelant valide avec le reste de son opération)."""
    assert action in ACTIONS, action
    db.add(AuditEvent(action=action, actor_id=actor_id, target_user_id=target_user_id, details=(details or None) and details[:255], ip=ip))
    # %r : un email ou un détail forgé ne peut pas insérer de fausses lignes dans le journal.
    logger.info("%s — auteur %s, cible %s, %r, ip %s", action, actor_id, target_user_id, details, ip)


def purge_old_events(db: Session) -> int:
    """Supprime (sans commit) les événements de plus de 180 jours et retourne leur nombre."""
    return db.execute(delete(AuditEvent).where(AuditEvent.created_at < datetime.now(timezone.utc) - RETENTION)).rowcount
