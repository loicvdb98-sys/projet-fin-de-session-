"""Limitation de débit (rate limiting) simple en mémoire pour protéger l'endpoint de connexion
contre les tentatives de force brute.
"""

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status

# Stockage en mémoire (par processus) des horodatages de tentatives par adresse IP.
# Non partagé entre plusieurs instances de l'API : suffisant pour ce projet mais
# ne résiste pas à un redémarrage ou à un déploiement multi-instance.
_attempts: dict[str, deque[datetime]] = defaultdict(deque)


def login_rate_limit(request: Request) -> None:
    """Dépendance FastAPI limitant à 10 tentatives de connexion par minute et par IP.
    Lève une 429 (Too Many Requests) au-delà de cette limite.
    """
    now = datetime.now(timezone.utc)
    key = request.client.host if request.client else "unknown"
    attempts = _attempts[key]
    while attempts and attempts[0] < now - timedelta(minutes=1):
        attempts.popleft()
    if len(attempts) >= 10:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives. Réessayez plus tard.")
    attempts.append(now)
