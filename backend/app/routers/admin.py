"""Routeur FastAPI réservé aux admins : consultation du journal d'activité (événements de sécurité)."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from ..database import get_db
from ..dependencies import require_roles
from ..models.audit import AuditEvent
from ..models.user import User

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_roles("admin"))])


class AuditEventRead(BaseModel):
    """Événement du journal, avec le nom de l'auteur et du compte concerné."""

    id: int
    created_at: datetime
    action: str
    actor_id: int | None
    actor_name: str | None
    target_user_id: int | None
    target_name: str | None
    details: str | None
    ip: str | None


@router.get("/audit", response_model=list[AuditEventRead])
def audit_events(
    db: Session = Depends(get_db),
    action: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=200, ge=1, le=500),
):
    """Derniers événements du journal d'activité, du plus récent au plus ancien (GET /admin/audit),
    éventuellement filtrés par type d'action. Réservé aux admins."""
    actor, target = aliased(User), aliased(User)
    query = (
        select(AuditEvent, actor.full_name, target.full_name)
        .outerjoin(actor, AuditEvent.actor_id == actor.id)
        .outerjoin(target, AuditEvent.target_user_id == target.id)
        .order_by(AuditEvent.id.desc())
        .limit(limit)
    )
    if action:
        query = query.where(AuditEvent.action == action)
    return [
        AuditEventRead(
            id=event.id, created_at=event.created_at, action=event.action, actor_id=event.actor_id, actor_name=actor_name,
            target_user_id=event.target_user_id, target_name=target_name, details=event.details, ip=event.ip,
        )
        for event, actor_name, target_name in db.execute(query).all()
    ]
