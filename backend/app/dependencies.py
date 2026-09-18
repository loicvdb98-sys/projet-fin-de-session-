"""Dépendances FastAPI réutilisables pour l'authentification et le contrôle d'accès
par rôle (utilisées via Depends() dans les routeurs).
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from .database import get_db
from .models.user import User
from .security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Décode le token JWT d'accès fourni dans l'en-tête Authorization et retourne
    l'utilisateur actif correspondant. Lève une 401 si le token est invalide,
    n'est pas de type "access", ou si l'utilisateur est introuvable/inactif.
    """
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = decode_token(token)
        if payload.get("type") != "access" or not payload.get("sub"):
            raise credentials_error
        user = db.get(User, int(payload["sub"]))
    except (JWTError, ValueError, TypeError):
        raise credentials_error
    if user is None or not user.is_active:
        raise credentials_error
    return user


def require_roles(*roles: str):
    """Fabrique une dépendance FastAPI qui restreint l'accès à un endpoint aux
    utilisateurs dont le rôle figure dans `roles` (ex: require_roles("coach")).
    Lève une 403 si le rôle de l'utilisateur courant n'est pas autorisé.
    """

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        return user

    return checker
