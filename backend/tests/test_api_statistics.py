"""Tests d'API des statistiques (GET /statistics/me) : chaque rôle voit son propre périmètre."""

from datetime import datetime, timedelta, timezone

from app.models import Performance, Session as SportSession


def add_session_with_performance(db_factory, coach_id: int, athlete_id: int, score: float) -> None:
    with db_factory() as db:
        session = SportSession(title="Séance", starts_at=datetime.now(timezone.utc) - timedelta(days=2), coach_id=coach_id)
        db.add(session)
        db.flush()
        db.add(Performance(user_id=athlete_id, session_id=session.id, score=score, recorded_at=datetime.now(timezone.utc)))
        db.commit()


def test_coach_average_only_covers_own_sessions(client, db_factory, make_user, auth_headers):
    coach = make_user("coach@example.com", role="coach")
    other_coach = make_user("autre.coach@example.com", role="coach")
    sportif = make_user("sportif@example.com")
    add_session_with_performance(db_factory, coach.id, sportif.id, 80)
    add_session_with_performance(db_factory, other_coach.id, sportif.id, 20)

    stats = client.get("/statistics/me", headers=auth_headers("coach@example.com")).json()

    assert stats["total_performances"] == 1
    assert stats["average_score"] == 80


def test_sportif_average_covers_own_performances(client, db_factory, make_user, auth_headers):
    coach = make_user("coach@example.com", role="coach")
    sportif = make_user("sportif@example.com")
    other = make_user("autre@example.com")
    add_session_with_performance(db_factory, coach.id, sportif.id, 60)
    add_session_with_performance(db_factory, coach.id, sportif.id, 90)
    add_session_with_performance(db_factory, coach.id, other.id, 10)

    stats = client.get("/statistics/me", headers=auth_headers("sportif@example.com")).json()

    assert stats["total_performances"] == 2
    assert stats["average_score"] == 75


def test_average_is_empty_without_performance(client, make_user, auth_headers):
    make_user("coach@example.com", role="coach")

    assert client.get("/statistics/me", headers=auth_headers("coach@example.com")).json()["average_score"] is None
