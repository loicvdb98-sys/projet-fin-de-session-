"""Limitation de débit (rate limiting) simple en mémoire pour protéger les endpoints
sensibles contre la force brute :

- par adresse IP : 10 appels par minute sur la connexion et l'inscription ;
- par compte : 5 échecs de connexion en 15 minutes bloquent ce compte temporairement,
  même si l'attaquant change d'adresse IP à chaque essai ;
- par utilisateur connecté : 5 tentatives de changement de mot de passe par minute
  (un jeton volé ne permet pas de deviner le mot de passe actuel en boucle).
"""

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status

# Stockage en mémoire (par processus) des horodatages par clé (« ip:… », « compte:… »…).
# Non partagé entre plusieurs instances de l'API : suffisant pour ce projet mais
# ne résiste pas à un redémarrage ou à un déploiement multi-instance.
_attempts: dict[str, deque[datetime]] = defaultdict(deque)

IP_LIMIT, IP_WINDOW = 10, timedelta(minutes=1)
ACCOUNT_LIMIT, ACCOUNT_WINDOW = 5, timedelta(minutes=15)
PASSWORD_LIMIT, PASSWORD_WINDOW = 5, timedelta(minutes=1)
# Au-delà de ce nombre de clés, les entrées expirées sont purgées (la mémoire ne grossit pas indéfiniment).
_PURGE_THRESHOLD = 1000


def _recent(key: str, window: timedelta, now: datetime) -> deque[datetime]:
    """Retourne les horodatages encore dans la fenêtre pour `key` (les plus anciens sont retirés)."""
    attempts = _attempts[key]
    while attempts and attempts[0] < now - window:
        attempts.popleft()
    return attempts


def _purge(now: datetime) -> None:
    """Supprime les clés sans tentative récente (fenêtre la plus longue)."""
    if len(_attempts) <= _PURGE_THRESHOLD:
        return
    longest = max(IP_WINDOW, ACCOUNT_WINDOW, PASSWORD_WINDOW)
    for key in [key for key, attempts in _attempts.items() if not attempts or attempts[-1] < now - longest]:
        del _attempts[key]


def _hit(key: str, limit: int, window: timedelta, message: str) -> None:
    """Enregistre un appel pour `key` ; lève une 429 si la limite est déjà atteinte."""
    now = datetime.now(timezone.utc)
    _purge(now)
    attempts = _recent(key, window, now)
    if len(attempts) >= limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, message)
    attempts.append(now)


def login_rate_limit(request: Request) -> None:
    """Dépendance FastAPI limitant à 10 tentatives de connexion par minute et par IP.
    Lève une 429 (Too Many Requests) au-delà de cette limite.
    """
    key = request.client.host if request.client else "unknown"
    _hit(f"ip:{key}", IP_LIMIT, IP_WINDOW, "Trop de tentatives. Réessayez plus tard.")


def ensure_account_not_locked(email: str) -> None:
    """Lève une 429 si le compte a déjà cumulé trop d'échecs de connexion récents."""
    if len(_recent(f"compte:{email}", ACCOUNT_WINDOW, datetime.now(timezone.utc))) >= ACCOUNT_LIMIT:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives sur ce compte. Réessayez dans quelques minutes.")


def record_login_failure(email: str) -> None:
    """Comptabilise un échec de connexion pour ce compte."""
    _attempts[f"compte:{email}"].append(datetime.now(timezone.utc))


def reset_login_failures(email: str) -> None:
    """Remet à zéro les échecs d'un compte après une connexion réussie."""
    _attempts.pop(f"compte:{email}", None)


def password_change_rate_limit(user_id: int) -> None:
    """Limite les tentatives de changement de mot de passe d'un utilisateur connecté."""
    _hit(f"mot-de-passe:{user_id}", PASSWORD_LIMIT, PASSWORD_WINDOW, "Trop de tentatives. Réessayez dans une minute.")
