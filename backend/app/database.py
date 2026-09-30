"""Configuration de l'accès à la base de données : moteur SQLAlchemy, fabrique de sessions
et classe de base déclarative utilisée par tous les modèles ORM.
"""

import logging
from collections.abc import Generator

from sqlalchemy import Engine, create_engine, inspect
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    """Classe de base déclarative SQLAlchemy dont héritent tous les modèles ORM."""

    pass


engine = create_engine(get_settings().database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
logger = logging.getLogger(__name__)


def ensure_indexes(bind: Engine) -> list[str]:
    """Crée les index déclarés dans les modèles qui manquent en base.

    `create_all` ne crée les index qu'avec une nouvelle table : sur une base existante,
    ceux ajoutés ensuite aux modèles ne seraient jamais créés. Un index impossible à
    créer (par exemple un index unique alors que des doublons existent) est signalé dans
    le journal sans empêcher l'API de démarrer. Retourne les noms des index créés.
    """
    created = []
    inspector = inspect(bind)
    for table in Base.metadata.sorted_tables:
        existing = {item["name"] for item in inspector.get_indexes(table.name)}
        for index in table.indexes:
            if index.name in existing:
                continue
            try:
                index.create(bind=bind)
                created.append(index.name)
                logger.info("Index %s créé", index.name)
            except SQLAlchemyError as error:
                logger.warning("Index %s non créé : %s", index.name, error)
    return created


def get_db() -> Generator[Session, None, None]:
    """Dépendance FastAPI fournissant une session de base de données par requête,
    fermée automatiquement à la fin (même en cas d'exception).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
