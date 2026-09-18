"""Routeur FastAPI exposant les endpoints d'inscription des sportifs aux séances
(participations) et de gestion de leur statut de présence."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.participation import Participation
from ..models.session import Session as SportSession
from ..models.user import User
from ..schemas.participation import ParticipationCreate, ParticipationRead, ParticipationUpdate
from ..services.time import is_past

router = APIRouter(prefix="/participations", tags=["participations"])


@router.get("/", response_model=list[ParticipationRead])
def list_participations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Liste les participations visibles par l'utilisateur connecté (GET /participations/) :
    toutes pour un admin, celles des séances qu'il encadre pour un coach, les siennes pour un sportif.
    """
    if user.role == "admin":
        query = select(Participation)
    elif user.role == "coach":
        query = select(Participation).join(SportSession, Participation.session_id == SportSession.id).where(SportSession.coach_id == user.id)
    else:
        query = select(Participation).where(Participation.user_id == user.id)
    return db.scalars(query.order_by(Participation.id)).all()


@router.post("/", response_model=ParticipationRead, status_code=201)
def create_participation(data: ParticipationCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Inscrit un utilisateur à une séance (POST /participations/). Un sportif ne peut
    s'inscrire que lui-même. Rejette les séances passées, complètes, ou une double
    inscription.
    """
    if user.role == "sportif" and data.user_id != user.id:
        raise HTTPException(403, "Vous ne pouvez inscrire qu'un compte")
    if not db.get(User, data.user_id) or not db.get(SportSession, data.session_id):
        raise HTTPException(404, "Utilisateur ou séance introuvable")
    session = db.get(SportSession, data.session_id)
    if is_past(session.starts_at):
        raise HTTPException(409, "Impossible de s'inscrire à une séance passée")
    registrations = db.scalar(
        select(func.count(Participation.id)).where(Participation.session_id == data.session_id)
    ) or 0
    if registrations >= session.capacity:
        raise HTTPException(409, "Cette séance est complète")
    if db.scalar(select(Participation).where(Participation.user_id == data.user_id, Participation.session_id == data.session_id)):
        raise HTTPException(409, "Participation déjà existante")
    item = Participation(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{participation_id}", response_model=ParticipationRead)
def update_participation(participation_id: int, data: ParticipationUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Met à jour le statut d'une participation (PATCH /participations/{participation_id}).
    Un sportif peut se remettre au statut "inscrit" ; seuls le coach de la séance ou
    un admin peuvent la marquer présent/absent.
    """
    item = db.get(Participation, participation_id)
    if not item:
        raise HTTPException(404, "Participation introuvable")
    if user.role == "sportif" and item.user_id != user.id:
        raise HTTPException(403, "Permissions insuffisantes")
    is_session_coach = item.session.coach_id == user.id
    if user.role not in {"admin"} and not is_session_coach and data.status != "inscrit":
        raise HTTPException(403, "Seul le coach de la séance ou un admin peut modifier la présence")
    if data.status not in {"inscrit", "present", "absent"}:
        raise HTTPException(400, "Statut invalide")
    item.status = data.status
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{participation_id}", status_code=204)
def delete_participation(participation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Supprime une participation, càd désinscrit un utilisateur d'une séance
    (DELETE /participations/{participation_id}). Impossible une fois la séance commencée.
    """
    item = db.get(Participation, participation_id)
    if not item:
        raise HTTPException(404, "Participation introuvable")
    if user.role == "sportif" and item.user_id != user.id:
        raise HTTPException(403, "Permissions insuffisantes")
    if is_past(item.session.starts_at):
        raise HTTPException(409, "Désinscription impossible après le début de la séance")
    if user.role not in {"sportif", "admin"} and item.session.coach_id != user.id:
        raise HTTPException(403, "Seul le coach de la séance ou un admin peut supprimer cette participation")
    db.delete(item)
    db.commit()
