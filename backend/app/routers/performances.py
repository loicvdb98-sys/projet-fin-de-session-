from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models.performance import Performance
from ..models.user import User
from ..models.participation import Participation
from ..models.session import Session as SportSession
from ..schemas.performance import PerformanceCreate, PerformanceRead, PerformanceUpdate

router = APIRouter(prefix="/performances", tags=["performances"])


@router.get("/", response_model=list[PerformanceRead])
def list_performances(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == "admin":
        query = select(Performance)
    elif user.role == "coach":
        query = select(Performance).join(SportSession, Performance.session_id == SportSession.id).where(SportSession.coach_id == user.id)
    else:
        query = select(Performance).where(Performance.user_id == user.id)
    return db.scalars(query.order_by(Performance.recorded_at.desc())).all()


@router.post("/", response_model=PerformanceRead, status_code=201)
def create_performance(data: PerformanceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == "sportif" and data.user_id != user.id:
        raise HTTPException(403, "Vous ne pouvez enregistrer que vos propres performances")
    session = db.get(SportSession, data.session_id)
    if not session:
        raise HTTPException(404, "Séance introuvable")
    if user.role == "coach" and session.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    participation = db.scalar(select(Participation).where(
        Participation.session_id == data.session_id,
        Participation.user_id == data.user_id,
    ))
    if not participation:
        raise HTTPException(409, "Le sportif doit être inscrit à la séance")
    item = Performance(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{performance_id}", response_model=PerformanceRead)
def update_performance(
    performance_id: int,
    data: PerformanceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.get(Performance, performance_id)
    if not item:
        raise HTTPException(404, "Performance introuvable")
    if user.role == "sportif" and item.user_id != user.id:
        raise HTTPException(403, "Vous ne pouvez modifier que vos propres performances")
    if user.role == "coach" and item.session.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{performance_id}", status_code=204)
def delete_performance(performance_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.get(Performance, performance_id)
    if not item:
        raise HTTPException(404, "Performance introuvable")
    if user.role == "sportif" and item.user_id != user.id:
        raise HTTPException(403, "Vous ne pouvez supprimer que vos propres performances")
    if user.role == "coach" and item.session.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    db.delete(item)
    db.commit()
