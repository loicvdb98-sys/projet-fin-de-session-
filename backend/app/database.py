"""Configuration de l'accès à la base de données : moteur SQLAlchemy, fabrique de sessions
et classe de base déclarative utilisée par tous les modèles ORM.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    """Classe de base déclarative SQLAlchemy dont héritent tous les modèles ORM."""

    pass


engine = create_engine(get_settings().database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    """Dépendance FastAPI fournissant une session de base de données par requête,
    fermée automatiquement à la fin (même en cas d'exception).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
