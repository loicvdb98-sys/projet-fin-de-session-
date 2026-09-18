"""Routeur FastAPI exposant les endpoints CRUD pour les séances d'entraînement."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models.notification import Notification
from ..models.session import Session as SportSession
from ..models.user import User
from ..schemas.session import SessionCreate, SessionRead, SessionUpdate
from ..services.time import is_past

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _notify_participants(db: Session, session: SportSession, title: str, message: str, kind: str = "info") -> None:
    """Crée une notification pour chaque inscrit à la séance (annulation ou modification).
    Ajoutée à la session SQLAlchemy sans commit : l'appelant commit avec le reste de son opération.
    """
    for participation in session.participations:
        db.add(Notification(user_id=participation.user_id, title=title, message=message, kind=kind))


@router.get("/", response_model=list[SessionRead])
def list_sessions(db: Session = Depends(get_db)):
    """Liste toutes les séances, triées par date de début (GET /sessions/). Accessible sans authentification."""
    # Charge coach (coach_name) et participations (registered_count) en une seule requête chacune,
    # au lieu d'une requête par séance.
    return db.scalars(
        select(SportSession)
        .options(joinedload(SportSession.coach), selectinload(SportSession.participations))
        .order_by(SportSession.starts_at)
    ).unique().all()


@router.post("/", response_model=SessionRead, status_code=201)
def create_session(data: SessionCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("coach", "admin"))):
    """Crée une nouvelle séance (POST /sessions/). Réservé aux comptes coach et admin ;
    un coach ne peut se déclarer lui-même que comme animateur. La date de début doit être future.
    """
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
    """Récupère le détail d'une séance par son id (GET /sessions/{session_id})."""
    item = db.scalar(
        select(SportSession)
        .options(joinedload(SportSession.coach), selectinload(SportSession.participations))
        .where(SportSession.id == session_id)
    )
    if not item:
        raise HTTPException(404, "Séance introuvable")
    return item


@router.patch("/{session_id}", response_model=SessionRead)
def update_session(session_id: int, data: SessionUpdate, db: Session = Depends(get_db), user: User = Depends(require_roles("coach", "admin"))):
    """Met à jour une séance (PATCH /sessions/{session_id}). Réservé au coach responsable
    ou à un admin. Impossible de modifier une séance déjà passée, ni de la reprogrammer dans le passé.
    """
    item = db.get(SportSession, session_id)
    if not item:
        raise HTTPException(404, "Séance introuvable")
    if user.role == "coach" and item.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    if is_past(item.starts_at):
        raise HTTPException(409, "Une séance passée ne peut plus être modifiée")
    if data.starts_at and is_past(data.starts_at):
        raise HTTPException(400, "Une séance doit être planifiée dans le futur")
    changes = data.model_dump(exclude_unset=True)
    schedule_changed = "starts_at" in changes and changes["starts_at"] != item.starts_at
    for key, value in changes.items():
        setattr(item, key, value)
    if changes:
        message = (
            f"Nouvel horaire : {item.starts_at:%d/%m/%Y à %H:%M}."
            if schedule_changed
            else "Les informations de la séance ont été mises à jour."
        )
        _notify_participants(db, item, f"Séance modifiée : {item.title}", message, kind="warning" if schedule_changed else "info")
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("coach", "admin"))):
    """Supprime une séance (DELETE /sessions/{session_id}). Réservé au coach responsable
    ou à un admin. Impossible de supprimer une séance déjà passée. Prévient chaque inscrit
    par notification.
    """
    item = db.get(SportSession, session_id)
    if not item:
        raise HTTPException(404, "Séance introuvable")
    if user.role == "coach" and item.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    if is_past(item.starts_at):
        raise HTTPException(409, "Une séance passée ne peut pas être supprimée")
    _notify_participants(
        db, item, f"Séance annulée : {item.title}",
        f"La séance prévue le {item.starts_at:%d/%m/%Y à %H:%M} a été annulée.", kind="warning"
    )
    db.delete(item)
    db.commit()
