"""Routeur FastAPI exposant les endpoints CRUD pour les objectifs personnels
et les records personnels de l'utilisateur connecté."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.goal import Goal
from ..models.record import PersonalRecord
from ..models.user import User
from ..schemas.goals import GoalCreate, GoalRead, RecordCreate, RecordRead

router = APIRouter(tags=["goals and records"])


@router.get("/goals", response_model=list[GoalRead])
def list_goals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Liste les objectifs de l'utilisateur connecté (GET /goals), les plus récents en premier."""
    return db.scalars(select(Goal).where(Goal.user_id == user.id).order_by(Goal.created_at.desc())).all()


@router.post("/goals", response_model=GoalRead, status_code=201)
def create_goal(data: GoalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Crée un nouvel objectif pour l'utilisateur connecté (POST /goals)."""
    item = Goal(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/goals/{goal_id}", response_model=GoalRead)
def update_goal(goal_id: int, data: GoalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Met à jour un objectif appartenant à l'utilisateur connecté (PATCH /goals/{goal_id})."""
    item = db.get(Goal, goal_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Objectif introuvable")
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Supprime un objectif appartenant à l'utilisateur connecté (DELETE /goals/{goal_id})."""
    item = db.get(Goal, goal_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Objectif introuvable")
    db.delete(item)
    db.commit()


@router.get("/records", response_model=list[RecordRead])
def list_records(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Liste les records personnels de l'utilisateur connecté (GET /records), du plus récent au plus ancien."""
    return db.scalars(select(PersonalRecord).where(PersonalRecord.user_id == user.id).order_by(PersonalRecord.achieved_at.desc())).all()


@router.post("/records", response_model=RecordRead, status_code=201)
def create_record(data: RecordCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Enregistre un nouveau record personnel pour l'utilisateur connecté (POST /records)."""
    item = PersonalRecord(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
