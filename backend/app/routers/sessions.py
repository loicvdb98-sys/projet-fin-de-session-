from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models.session import Session as SportSession
from ..models.user import User
from ..schemas.session import SessionCreate, SessionRead, SessionUpdate
from ..services.time import is_past

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/", response_model=list[SessionRead])
def list_sessions(db: Session = Depends(get_db)):
    return db.scalars(select(SportSession).order_by(SportSession.starts_at)).all()


@router.post("/", response_model=SessionRead, status_code=201)
def create_session(data: SessionCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("coach", "admin"))):
    if user.role == "coach" and data.coach_id != user.id:
        raise HTTPException(403, "Un coach ne peut créer que ses propres séances")
    if is_past(data.starts_at):
        raise HTTPException(400, "Une séance doit être planifiée dans le futur")
    if not db.get(User, data.coach_id):
        raise HTTPException(404, "Coach introuvable")
    item = SportSession(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{session_id}", response_model=SessionRead)
def get_session(session_id: int, db: Session = Depends(get_db)):
    item = db.get(SportSession, session_id)
    if not item:
        raise HTTPException(404, "Séance introuvable")
    return item


@router.patch("/{session_id}", response_model=SessionRead)
def update_session(session_id: int, data: SessionUpdate, db: Session = Depends(get_db), user: User = Depends(require_roles("coach", "admin"))):
    item = db.get(SportSession, session_id)
    if not item:
        raise HTTPException(404, "Séance introuvable")
    if user.role == "coach" and item.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    if is_past(item.starts_at):
        raise HTTPException(409, "Une séance passée ne peut plus être modifiée")
    if data.starts_at and is_past(data.starts_at):
        raise HTTPException(400, "Une séance doit être planifiée dans le futur")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("coach", "admin"))):
    item = db.get(SportSession, session_id)
    if not item:
        raise HTTPException(404, "Séance introuvable")
    if user.role == "coach" and item.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    if is_past(item.starts_at):
        raise HTTPException(409, "Une séance passée ne peut pas être supprimée")
    db.delete(item)
    db.commit()
