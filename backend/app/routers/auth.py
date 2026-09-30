"""Routeur FastAPI exposant les endpoints d'authentification : inscription, connexion,
rafraîchissement et révocation des jetons JWT, et changement de mot de passe.
"""

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.refresh_token import RefreshToken
from ..models.user import User
from ..rate_limit import ensure_account_not_locked, login_rate_limit, password_change_rate_limit, record_login_failure, reset_login_failures
from ..schemas.auth import LogoutRequest, PasswordChange, Token, TokenRefresh
from ..dependencies import get_current_user
from ..schemas.user import UserCreate, UserRead
from ..security import TokenError, create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from ..config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# Un refresh token déjà remplacé (rotation) peut être présenté une seconde fois de bonne foi,
# par exemple par deux onglets qui renouvellent leur session au même instant. Au-delà de ce
# délai, sa réutilisation signale un vol probable du jeton.
REUSE_GRACE_PERIOD = timedelta(seconds=60)


@lru_cache
def _dummy_hash() -> str:
    """Hachage de référence, vérifié quand l'email est inconnu : la réponse prend alors le
    même temps que pour un vrai compte, ce qui empêche de deviner quels emails existent."""
    return hash_password("compte-inexistant-SportPlan-0")


def revoke_all_refresh_tokens(user_id: int, db: Session) -> None:
    """Révoque (sans commit) tous les refresh tokens encore actifs d'un utilisateur."""
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )


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
    """Crée un nouveau compte sportif (POST /auth/register). L'inscription publique ne
    crée que des comptes "sportif" : les rôles coach et admin sont attribués ensuite par
    un admin, depuis la gestion des comptes (PATCH /users/{id}). Retourne l'utilisateur
    créé. Soumis à la limitation de débit anti-brute-force.
    """
    if data.role != "sportif":
        raise HTTPException(403, "L'inscription crée uniquement des comptes sportif")
    email = str(data.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email déjà utilisé")
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
    ensure_account_not_locked(email)
    user = db.scalar(select(User).where(User.email == email))
    password_ok = verify_password(form.password, user.hashed_password if user else _dummy_hash())
    if not user or not user.is_active or not password_ok:
        record_login_failure(email)
        # %r échappe les retours à la ligne : un email forgé ne peut pas insérer de fausses lignes dans le journal.
        logger.warning("Échec de connexion pour %r", email[:254])
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email ou mot de passe incorrect")
    reset_login_failures(email)
    refresh_token = _issue_refresh_token(user.id, db)
    db.commit()
    logger.info("Connexion réussie pour l'utilisateur %s", user.id)
    return {"access_token": create_access_token(str(user.id)), "refresh_token": refresh_token}


@router.post("/refresh", response_model=Token)
def refresh(data: TokenRefresh, db: Session = Depends(get_db)):
    """Échange un refresh token valide contre une nouvelle paire de jetons (POST /auth/refresh).
    Applique une rotation : l'ancien refresh token est révoqué et un nouveau est émis.
    Si un jeton déjà remplacé est réutilisé (hors délai de grâce), toutes les sessions du
    compte sont fermées : le jeton a probablement été volé.
    """
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        user = db.get(User, int(payload["sub"]))
        stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == _token_hash(data.refresh_token)))
        if stored and user and stored.user_id == user.id and stored.revoked_at is not None:
            revoked_at = stored.revoked_at if stored.revoked_at.tzinfo else stored.revoked_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - revoked_at > REUSE_GRACE_PERIOD:
                revoke_all_refresh_tokens(user.id, db)
                db.commit()
                logger.warning("Réutilisation d'un refresh token révoqué : sessions fermées pour l'utilisateur %s", user.id)
            user = None
        elif not stored or not stored.is_valid or not user or stored.user_id != user.id:
            user = None
        elif user.is_active:
            stored.revoked_at = datetime.now(timezone.utc)
            new_refresh = _issue_refresh_token(user.id, db)
            db.commit()
            return {"access_token": create_access_token(str(user.id)), "refresh_token": new_refresh}
    except (TokenError, ValueError, TypeError, KeyError):
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


@router.post("/logout-all", status_code=204)
def logout_all(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Ferme toutes les sessions de l'utilisateur connecté (POST /auth/logout-all) : chaque
    refresh token est révoqué, sur tous les appareils. Les jetons d'accès déjà émis restent
    valables jusqu'à leur expiration (30 minutes au plus).
    """
    revoke_all_refresh_tokens(user.id, db)
    db.commit()
    logger.info("Toutes les sessions fermées pour l'utilisateur %s", user.id)


@router.post("/change-password", response_model=Token)
def change_password(data: PasswordChange, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Change le mot de passe de l'utilisateur connecté (POST /auth/change-password).
    Nécessite le mot de passe actuel et un nouveau mot de passe différent et robuste.
    Les sessions ouvertes sur les autres appareils sont fermées ; une nouvelle paire de
    jetons est renvoyée pour que l'appareil courant reste connecté.
    """
    password_change_rate_limit(user.id)
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mot de passe actuel incorrect")
    if data.current_password == data.new_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Le nouveau mot de passe doit être différent")
    user.hashed_password = hash_password(data.new_password)
    revoke_all_refresh_tokens(user.id, db)
    refresh_token = _issue_refresh_token(user.id, db)
    db.commit()
    logger.info("Mot de passe changé pour l'utilisateur %s", user.id)
    return {"access_token": create_access_token(str(user.id)), "refresh_token": refresh_token}
