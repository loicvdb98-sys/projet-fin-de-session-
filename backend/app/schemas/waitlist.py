"""Schémas Pydantic de la liste d'attente."""

from datetime import datetime

from pydantic import BaseModel


class WaitlistRead(BaseModel):
    """Place de l'utilisateur connecté dans la liste d'attente d'une séance (1 = premier servi)."""

    session_id: int
    position: int
    created_at: datetime
