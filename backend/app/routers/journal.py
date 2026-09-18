"""Routeur FastAPI exposant les endpoints du journal d'entraînement : consultation
filtrée selon le rôle, création par le sportif participant, et complément par le coach."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.journal import TrainingJournal
from ..models.participation import Participation
from ..models.session import Session as SportSession
from ..models.user import User
from ..schemas.journal import JournalCreate, JournalRead, JournalUpdate

router = APIRouter(prefix="/journal", tags=["training journal"])


def _visible_query(user: User):
    """Construit la requête des entrées de journal visibles par `user` : toutes pour un
    admin, celles de ses séances pour un coach, uniquement les siennes pour un sportif.
    """
    if user.role == "admin":
        return select(TrainingJournal)
    if user.role == "coach":
        return select(TrainingJournal).join(SportSession, TrainingJournal.session_id == SportSession.id).where(SportSession.coach_id == user.id)
    return select(TrainingJournal).where(TrainingJournal.user_id == user.id)


@router.get("", response_model=list[JournalRead])
def list_journals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Liste les entrées de journal visibles par l'utilisateur connecté (GET /journal),
    selon la portée définie par `_visible_query` (rôle-dépendante), triées par date de mise à jour.
    """
    return db.scalars(_visible_query(user).order_by(TrainingJournal.updated_at.desc())).all()


@router.post("", response_model=JournalRead, status_code=201)
def create_journal(data: JournalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Crée une entrée de journal pour la séance indiquée (POST /journal).
    Un sportif doit participer à la séance ; un coach doit en être responsable.
    Une seule entrée est autorisée par couple (utilisateur, séance).
    """
    session = db.get(SportSession, data.session_id)
    if not session:
        raise HTTPException(404, "Séance introuvable")
    if user.role == "sportif":
        participation = db.scalar(select(Participation).where(Participation.session_id == data.session_id, Participation.user_id == user.id))
        if not participation:
            raise HTTPException(403, "Vous devez participer à cette séance pour écrire dans le journal")
    elif user.role == "coach" and session.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    existing = db.scalar(select(TrainingJournal).where(TrainingJournal.user_id == user.id, TrainingJournal.session_id == data.session_id))
    if existing:
        raise HTTPException(409, "Un journal existe déjà pour cette séance")
    item = TrainingJournal(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{journal_id}", response_model=JournalRead)
def update_journal(journal_id: int, data: JournalUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Met à jour une entrée de journal (PATCH /journal/{journal_id}).
    Un sportif ne peut modifier que son propre journal et ne peut pas toucher au
    commentaire du coach ; un coach responsable de la séance ne peut modifier que ce
    commentaire.
    """
    item = db.get(TrainingJournal, journal_id)
    if not item:
        raise HTTPException(404, "Entrée de journal introuvable")
    session = db.get(SportSession, item.session_id)
    if user.role == "sportif" and item.user_id != user.id:
        raise HTTPException(403, "Vous ne pouvez modifier que votre journal")
    if user.role == "coach" and (not session or session.coach_id != user.id):
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    changes = data.model_dump(exclude_unset=True)
    if user.role == "sportif":
        # Le champ coach_comment n'est modifiable que par le coach.
        changes.pop("coach_comment", None)
    if user.role == "coach":
        # Le coach ne peut modifier que le commentaire, jamais le reste de l'entrée.
        changes = {"coach_comment": changes["coach_comment"]} if "coach_comment" in changes else {}
    for key, value in changes.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item
