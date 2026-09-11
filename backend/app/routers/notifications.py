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
    return db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())).all()


@router.post("", response_model=NotificationRead, status_code=201)
def create_notification(data: NotificationCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))):
    item = Notification(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_read(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.get(Notification, notification_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Notification introuvable")
    item.is_read = True
    db.commit()
    db.refresh(item)
    return item
