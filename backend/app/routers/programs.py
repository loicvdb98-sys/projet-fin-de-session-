"""Routeur FastAPI exposant les endpoints CRUD pour les programmes d'entraînement personnels."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.program import WorkoutProgram
from ..models.user import User
from ..schemas.program import ProgramCreate, ProgramRead

router = APIRouter(prefix="/programs", tags=["programs"])


@router.get("", response_model=list[ProgramRead])
def list_programs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Liste les programmes d'entraînement de l'utilisateur connecté (GET /programs), les plus récents en premier."""
    return db.scalars(select(WorkoutProgram).where(WorkoutProgram.user_id == user.id).order_by(WorkoutProgram.created_at.desc())).all()


@router.post("", response_model=ProgramRead, status_code=201)
def create_program(data: ProgramCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Crée un nouveau programme d'entraînement pour l'utilisateur connecté (POST /programs)."""
    item = WorkoutProgram(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{program_id}", status_code=204)
def delete_program(program_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Supprime un programme d'entraînement appartenant à l'utilisateur connecté (DELETE /programs/{program_id})."""
    item = db.get(WorkoutProgram, program_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Programme introuvable")
    db.delete(item)
    db.commit()
