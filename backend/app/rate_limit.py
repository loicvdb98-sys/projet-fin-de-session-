from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status

_attempts: dict[str, deque[datetime]] = defaultdict(deque)


def login_rate_limit(request: Request) -> None:
    now = datetime.now(timezone.utc)
    key = request.client.host if request.client else "unknown"
    attempts = _attempts[key]
    while attempts and attempts[0] < now - timedelta(minutes=1):
        attempts.popleft()
    if len(attempts) >= 10:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives. Réessayez plus tard.")
    attempts.append(now)
