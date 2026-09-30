"""Fonctions de sécurité : hachage/vérification des mots de passe (Argon2) et
création/décodage des jetons JWT d'accès et de rafraîchissement.
"""

import secrets
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

from .config import get_settings

ALGORITHM = "HS256"
password_hasher = PasswordHasher()
# Erreur levée pour tout jeton invalide, expiré, mal signé ou incomplet (base des exceptions PyJWT).
TokenError = jwt.PyJWTError


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
    ("access" ou "refresh") et une durée de validité donnée. L'identifiant unique `jti`
    distingue deux jetons émis dans la même seconde (sinon identiques, donc de même empreinte
    en base pour les refresh tokens).
    """
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "type": token_type, "iat": now, "exp": now + expires_delta, "jti": secrets.token_urlsafe(16)}
    return jwt.encode(payload, get_settings().secret_key, algorithm=ALGORITHM)


def create_access_token(subject: str) -> str:
    """Crée un jeton d'accès de courte durée (voir access_token_expire_minutes)."""
    return create_token(subject, "access", timedelta(minutes=get_settings().access_token_expire_minutes))


def create_refresh_token(subject: str) -> str:
    """Crée un jeton de rafraîchissement de longue durée (voir refresh_token_expire_days)."""
    return create_token(subject, "refresh", timedelta(days=get_settings().refresh_token_expire_days))


def decode_token(token: str) -> dict:
    """Décode et vérifie la signature d'un JWT, retourne son contenu (payload).
    Seul l'algorithme HS256 est accepté (un jeton « alg: none » ou signé autrement est
    refusé) et les champs sub, type, iat et exp sont obligatoires.
    Lève une TokenError si le token est invalide, expiré, mal signé ou incomplet.
    """
    return jwt.decode(
        token,
        get_settings().secret_key,
        algorithms=[ALGORITHM],
        options={"require": ["sub", "type", "iat", "exp"]},
    )
