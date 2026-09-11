from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models.user import User
from ..schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/", response_model=list[UserRead], dependencies=[Depends(require_roles("coach", "admin"))])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if current.role != "admin" and current.id != user_id:
        raise HTTPException(403, "Permissions insuffisantes")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    if data.role and current.role != "admin":
        raise HTTPException(403, "Seul un admin peut changer le rôle")
    if data.is_active is not None and current.role != "admin":
        raise HTTPException(403, "Seul un admin peut activer ou désactiver un compte")
    if data.role and data.role not in {"coach", "sportif", "admin"}:
        raise HTTPException(400, "Rôle invalide")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user
