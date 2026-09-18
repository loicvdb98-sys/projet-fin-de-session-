"""Routeur FastAPI exposant les endpoints d'authentification : inscription, connexion,
rafraîchissement et révocation des jetons JWT, et changement de mot de passe.
"""

import hashlib
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.refresh_token import RefreshToken
from ..models.user import User
from ..rate_limit import login_rate_limit
from ..schemas.auth import LogoutRequest, PasswordChange, Token, TokenRefresh
from ..dependencies import get_current_user
from ..schemas.user import UserCreate, UserRead
from ..security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from ..config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


def _token_hash(token: str) -> str:
    """Calcule l'empreinte SHA-256 d'un refresh token, seule forme stockée en base."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _issue_refresh_token(user_id: int, db: Session) -> str:
    """Génère un nouveau refresh token pour l'utilisateur et l'enregistre (sous forme hachée,
    sans commit) en base. Retourne le jeton en clair à transmettre au client.
    """
    token = create_refresh_token(str(user_id))
    db.add(RefreshToken(
        token_hash=_token_hash(token),
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=get_settings().refresh_token_expire_days),
    ))
    return token


@router.post("/register", response_model=UserRead, status_code=201, dependencies=[Depends(login_rate_limit)])
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Crée un nouveau compte utilisateur (POST /auth/register). Le rôle doit être
    "coach" ou "sportif" (le rôle "admin" ne peut pas être créé via cet endpoint).
    Retourne l'utilisateur créé. Soumis à la limitation de débit anti-brute-force.
    """
    email = str(data.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email déjà utilisé")
    if data.role not in {"coach", "sportif"}:
        raise HTTPException(400, "Rôle invalide")
    user = User(email=email, full_name=data.full_name, hashed_password=hash_password(data.password), role=data.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token, dependencies=[Depends(login_rate_limit)])
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authentifie un utilisateur par email/mot de passe (POST /auth/login) et retourne
    une paire de jetons (accès + rafraîchissement). Soumis à la limitation de débit.
    """
    email = form.username.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active or not verify_password(form.password, user.hashed_password):
        logger.warning("Échec de connexion pour %s", form.username)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email ou mot de passe incorrect")
    refresh_token = _issue_refresh_token(user.id, db)
    db.commit()
    logger.info("Connexion réussie pour l'utilisateur %s", user.id)
    return {"access_token": create_access_token(str(user.id)), "refresh_token": refresh_token}


@router.post("/refresh", response_model=Token)
def refresh(data: TokenRefresh, db: Session = Depends(get_db)):
    """Échange un refresh token valide contre une nouvelle paire de jetons (POST /auth/refresh).
    Applique une rotation : l'ancien refresh token est révoqué et un nouveau est émis.
    """
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        user = db.get(User, int(payload["sub"]))
        stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == _token_hash(data.refresh_token)))
        if not stored or not stored.is_valid or not user or stored.user_id != user.id:
            user = None
        elif user.is_active:
            stored.revoked_at = datetime.now(timezone.utc)
            new_refresh = _issue_refresh_token(user.id, db)
            db.commit()
            return {"access_token": create_access_token(str(user.id)), "refresh_token": new_refresh}
    except (JWTError, ValueError, TypeError, KeyError):
        user = None
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token invalide")
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token invalide")


@router.post("/logout", status_code=204)
def logout(data: LogoutRequest, db: Session = Depends(get_db)):
    """Révoque le refresh token fourni (POST /auth/logout), déconnectant l'utilisateur.
    Ne fait rien si le jeton est inconnu ou déjà révoqué (opération idempotente).
    """
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == _token_hash(data.refresh_token)))
    if stored and stored.revoked_at is None:
        stored.revoked_at = datetime.now(timezone.utc)
        db.commit()
        logger.info("Refresh token révoqué pour l'utilisateur %s", stored.user_id)


@router.post("/change-password", status_code=204)
def change_password(data: PasswordChange, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Change le mot de passe de l'utilisateur connecté (POST /auth/change-password).
    Nécessite de fournir le mot de passe actuel et exige un nouveau mot de passe différent.
    """
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mot de passe actuel incorrect")
    if data.current_password == data.new_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Le nouveau mot de passe doit être différent")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
