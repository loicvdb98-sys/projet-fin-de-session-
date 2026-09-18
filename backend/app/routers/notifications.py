"""Routeur FastAPI exposant les endpoints de notifications utilisateur."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models.notification import Notification
from ..models.user import User
from ..schemas.notification import NotificationCreate, NotificationRead

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationRead])
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Liste les notifications de l'utilisateur connecté (GET /notifications), les plus récentes en premier."""
    return db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())).all()


@router.post("", response_model=NotificationRead, status_code=201)
def create_notification(data: NotificationCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))):
    """Crée une notification (POST /notifications). Réservé aux comptes admin.

    Note : la notification est créée avec l'id de l'admin appelant comme `user_id`,
    et non celui d'un destinataire fourni dans `data` — comportement actuel du code.
    """
    item = Notification(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_read(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Marque une notification de l'utilisateur connecté comme lue (PATCH /notifications/{notification_id}/read)."""
    item = db.get(Notification, notification_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Notification introuvable")
    item.is_read = True
    db.commit()
    db.refresh(item)
    return item
