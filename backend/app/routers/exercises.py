"""Routeur FastAPI exposant les endpoints CRUD pour les exercices d'une séance donnée."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_roles
from ..models.exercise import Exercise
from ..models.session import Session as SportSession
from ..models.user import User
from ..schemas.exercise import ExerciseCreate, ExerciseRead

router = APIRouter(prefix="/sessions/{session_id}/exercises", tags=["exercises"])


@router.get("/", response_model=list[ExerciseRead])
def list_exercises(session_id: int, db: Session = Depends(get_db)):
    """Liste les exercices d'une séance (GET /sessions/{session_id}/exercises/), triés par id."""
    return db.scalars(select(Exercise).where(Exercise.session_id == session_id).order_by(Exercise.id)).all()


@router.post("/", response_model=ExerciseRead, status_code=201)
def create_exercise(
    session_id: int,
    data: ExerciseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("coach", "admin")),
):
    """Ajoute un exercice à une séance (POST /sessions/{session_id}/exercises/).
    Réservé aux comptes coach (propriétaire de la séance) et admin.
    """
    session = db.get(SportSession, session_id)
    if not session:
        raise HTTPException(404, "Séance introuvable")
    if user.role == "coach" and session.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    exercise = Exercise(session_id=session_id, **data.model_dump())
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=204)
def delete_exercise(
    session_id: int,
    exercise_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("coach", "admin")),
):
    """Supprime un exercice d'une séance (DELETE /sessions/{session_id}/exercises/{exercise_id}).
    Réservé aux comptes coach (propriétaire de la séance) et admin.
    """
    exercise = db.get(Exercise, exercise_id)
    if not exercise or exercise.session_id != session_id:
        raise HTTPException(404, "Exercice introuvable")
    if user.role == "coach" and exercise.session.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    db.delete(exercise)
    db.commit()
