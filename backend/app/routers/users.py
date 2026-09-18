"""Routeur FastAPI exposant les endpoints de consultation et de gestion des comptes utilisateurs."""

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
    """Retourne le profil de l'utilisateur actuellement connecté (GET /users/me)."""
    return user


@router.get("/", response_model=list[UserRead], dependencies=[Depends(require_roles("coach", "admin"))])
def list_users(db: Session = Depends(get_db)):
    """Liste tous les utilisateurs (GET /users/), triés par id. Réservé aux comptes coach et admin."""
    return db.scalars(select(User).order_by(User.id)).all()


@router.get("/athletes", response_model=list[UserRead], dependencies=[Depends(require_roles("coach", "admin"))])
def list_athletes(db: Session = Depends(get_db)):
    """Liste les sportifs actifs (GET /users/athletes), triés par nom. Réservé aux comptes coach et admin."""
    return db.scalars(select(User).where(User.role == "sportif", User.is_active.is_(True)).order_by(User.full_name)).all()


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Met à jour un compte utilisateur (PATCH /users/{user_id}). Un utilisateur peut
    modifier son propre profil ; seul un admin peut modifier un autre compte, changer
    un rôle, ou activer/désactiver un compte.
    """
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
