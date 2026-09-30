"""Tests des optimisations de la base et de l'API : index créés sur une base existante,
unicité des inscriptions, purge des refresh tokens expirés et compression des réponses."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool

from app.database import Base, ensure_indexes
from app.models import Participation, Session as SportSession, User
from app.models.refresh_token import RefreshToken
from app.routers.auth import purge_expired_refresh_tokens


def test_missing_indexes_are_created_on_an_existing_database():
    engine = create_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        # Base créée avant l'ajout de ces index aux modèles.
        conn.execute(text("DROP INDEX ux_participations_user_session"))
        conn.execute(text("DROP INDEX ix_sport_sessions_starts_at"))

    created = ensure_indexes(engine)

    assert set(created) == {"ux_participations_user_session", "ix_sport_sessions_starts_at"}
    names = {index["name"] for index in inspect(engine).get_indexes("participations")}
    assert "ux_participations_user_session" in names
    assert ensure_indexes(engine) == []


def test_database_refuses_a_duplicate_registration(db_factory, make_user):
    coach = make_user("coach@example.com", role="coach")
    athlete = make_user("sportif@example.com")
    with db_factory() as db:
        session = SportSession(title="Séance", starts_at=datetime.now(timezone.utc) + timedelta(days=2), coach_id=coach.id)
        db.add(session)
        db.commit()
        db.add_all([Participation(user_id=athlete.id, session_id=session.id), Participation(user_id=athlete.id, session_id=session.id)])
        with pytest.raises(IntegrityError):
            db.commit()


def test_only_expired_refresh_tokens_are_purged(db_factory, make_user):
    user = make_user("jetons@example.com")
    now = datetime.now(timezone.utc)
    with db_factory() as db:
        db.add_all([
            RefreshToken(token_hash="a" * 64, user_id=user.id, expires_at=now - timedelta(days=1)),
            RefreshToken(token_hash="b" * 64, user_id=user.id, expires_at=now + timedelta(days=6)),
        ])
        db.commit()

        assert purge_expired_refresh_tokens(db) == 1
        db.commit()
        assert [token.token_hash for token in db.query(RefreshToken)] == ["b" * 64]


def test_large_responses_are_compressed(client, db_factory, make_user):
    coach = make_user("coach@example.com", role="coach")
    with db_factory() as db:
        db.add_all([
            SportSession(title=f"Séance {index}", description="Circuit complet " * 5, starts_at=datetime.now(timezone.utc) + timedelta(days=index + 1), coach_id=coach.id)
            for index in range(10)
        ])
        db.commit()

    response = client.get("/sessions/", headers={"Accept-Encoding": "gzip"})

    assert response.status_code == 200
    assert response.headers["content-encoding"] == "gzip"
    assert len(response.json()) == 10


def test_a_deactivated_account_cannot_be_registered(client, db_factory, make_user, auth_headers):
    make_user("admin@example.com", role="admin")
    coach = make_user("coach@example.com", role="coach")
    athlete = make_user("ancien@example.com")
    with db_factory() as db:
        db.get(User, athlete.id).is_active = False
        session = SportSession(title="Séance", starts_at=datetime.now(timezone.utc) + timedelta(days=2), coach_id=coach.id)
        db.add(session)
        db.commit()
        session_id = session.id

    response = client.post("/participations/", json={"user_id": athlete.id, "session_id": session_id}, headers=auth_headers("admin@example.com"))

    assert response.status_code == 409
