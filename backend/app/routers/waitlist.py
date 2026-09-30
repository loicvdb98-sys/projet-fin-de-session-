"""Routeur FastAPI de la liste d'attente des séances complètes : la rejoindre, la quitter et
consulter ses positions. L'inscription automatique quand une place se libère est faite par
services/waitlist.py (désinscription, places ajoutées)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.participation import Participation
from ..models.session import Session as SportSession
from ..models.user import User
from ..models.waitlist import WaitlistEntry
from ..schemas.waitlist import WaitlistRead
from ..services.time import is_past

router = APIRouter(prefix="/sessions", tags=["waitlist"])


def _read(db: Session, entry: WaitlistEntry) -> WaitlistRead:
    """Position d'une demande dans la file de sa séance (1 = la plus ancienne)."""
    position = db.scalar(select(func.count(WaitlistEntry.id)).where(WaitlistEntry.session_id == entry.session_id, WaitlistEntry.id <= entry.id))
    return WaitlistRead(session_id=entry.session_id, position=position, created_at=entry.created_at)


@router.get("/waitlist/mine", response_model=list[WaitlistRead])
def my_waitlist(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Listes d'attente où figure l'utilisateur connecté, avec sa position (GET /sessions/waitlist/mine)."""
    entries = db.scalars(select(WaitlistEntry).where(WaitlistEntry.user_id == user.id).order_by(WaitlistEntry.id)).all()
    return [_read(db, entry) for entry in entries]


@router.post("/{session_id}/waitlist", response_model=WaitlistRead, status_code=201)
def join_waitlist(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Place l'utilisateur connecté dans la liste d'attente d'une séance complète
    (POST /sessions/{session_id}/waitlist). Refusé (409) pour une séance passée, qui a encore
    des places, que l'utilisateur anime, où il est déjà inscrit ou déjà en attente.
    """
    session = db.get(SportSession, session_id)
    if not session:
        raise HTTPException(404, "Séance introuvable")
    if is_past(session.starts_at):
        raise HTTPException(409, "Cette séance est déjà passée")
    if session.coach_id == user.id:
        raise HTTPException(409, "Le coach ne peut pas s'inscrire à la séance qu'il anime")
    if db.scalar(select(Participation.id).where(Participation.user_id == user.id, Participation.session_id == session_id)):
        raise HTTPException(409, "Vous êtes déjà inscrit à cette séance")
    registered = db.scalar(select(func.count(Participation.id)).where(Participation.session_id == session_id)) or 0
    if registered < session.capacity:
        raise HTTPException(409, "Il reste des places : inscrivez-vous directement")
    entry = WaitlistEntry(user_id=user.id, session_id=session_id)
    db.add(entry)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Vous êtes déjà sur la liste d'attente")
    db.refresh(entry)
    return _read(db, entry)


@router.delete("/{session_id}/waitlist", status_code=204)
def leave_waitlist(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Retire l'utilisateur connecté de la liste d'attente d'une séance (DELETE /sessions/{session_id}/waitlist)."""
    entry = db.scalar(select(WaitlistEntry).where(WaitlistEntry.user_id == user.id, WaitlistEntry.session_id == session_id))
    if not entry:
        raise HTTPException(404, "Vous n'êtes pas sur la liste d'attente de cette séance")
    db.delete(entry)
    db.commit()
