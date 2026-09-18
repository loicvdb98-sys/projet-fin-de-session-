"""Fonctions de sécurité : hachage/vérification des mots de passe (Argon2) et
création/décodage des jetons JWT d'accès et de rafraîchissement.
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

from .config import get_settings

ALGORITHM = "HS256"
password_hasher = PasswordHasher()


def verify_password(plain: str, hashed: str) -> bool:
    """Vérifie qu'un mot de passe en clair correspond au hachage Argon2 stocké."""
    try:
        return password_hasher.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError):
        return False


def hash_password(password: str) -> str:
    """Calcule le hachage Argon2 d'un mot de passe en clair, à stocker en base."""
    return password_hasher.hash(password)


def create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    """Crée un JWT signé pour `subject` (identifiant utilisateur), avec un type
    ("access" ou "refresh") et une durée de validité donnée.
    """
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "type": token_type, "iat": now, "exp": now + expires_delta}
    return jwt.encode(payload, get_settings().secret_key, algorithm=ALGORITHM)


def create_access_token(subject: str) -> str:
    """Crée un jeton d'accès de courte durée (voir access_token_expire_minutes)."""
    return create_token(subject, "access", timedelta(minutes=get_settings().access_token_expire_minutes))


def create_refresh_token(subject: str) -> str:
    """Crée un jeton de rafraîchissement de longue durée (voir refresh_token_expire_days)."""
    return create_token(subject, "refresh", timedelta(days=get_settings().refresh_token_expire_days))


def decode_token(token: str) -> dict:
    """Décode et vérifie la signature d'un JWT, retourne son contenu (payload).
    Lève une JWTError si le token est invalide, expiré ou mal signé.
    """
    return jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])


def is_token_error(error: Exception) -> bool:
    """Indique si une exception donnée correspond à une erreur de traitement de JWT."""
    return isinstance(error, JWTError)
