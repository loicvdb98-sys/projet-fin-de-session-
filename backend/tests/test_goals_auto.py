"""Tests des objectifs en séances, tenus à jour automatiquement à partir des présences."""

from datetime import date, datetime, timedelta, timezone

from app.models import Goal, Participation, Session as SportSession
from app.services.goals import session_goal_window, sync_session_goals


def add_presence(db, coach_id: int, athlete_id: int, starts_at: datetime, status: str = "present") -> None:
    session = SportSession(title="Séance", starts_at=starts_at, coach_id=coach_id)
    db.add(session)
    db.flush()
    db.add(Participation(user_id=athlete_id, session_id=session.id, status=status))


def test_session_goals_follow_presences_since_the_first_of_the_creation_month(client, db_factory, make_user, auth_headers):
    coach = make_user("coach@example.com", role="coach")
    athlete = make_user("sportif@example.com")
    now = datetime.now(timezone.utc)
    with db_factory() as db:
        add_presence(db, coach.id, athlete.id, now - timedelta(days=1))
        add_presence(db, coach.id, athlete.id, now - timedelta(hours=2))
        add_presence(db, coach.id, athlete.id, now - timedelta(hours=3), status="absent")
        add_presence(db, coach.id, athlete.id, now - timedelta(days=70))  # mois précédent : ignorée
        add_presence(db, coach.id, athlete.id, now + timedelta(days=1), status="inscrit")  # à venir : ignorée
        db.commit()
    headers = auth_headers("sportif@example.com")

    created = client.post("/goals", json={"title": "12 séances", "metric": "séances", "target_value": 12, "current_value": 0, "unit": "séances"}, headers=headers).json()
    other = client.post("/goals", json={"title": "Squat", "metric": "force", "target_value": 100, "current_value": 60, "unit": "kg"}, headers=headers).json()

    assert (created["current_value"], created["auto_progress"]) == (2, True)
    assert (other["current_value"], other["auto_progress"]) == (60, False)


def test_a_manual_value_is_ignored_for_session_goals(client, db_factory, make_user, auth_headers):
    make_user("sportif@example.com")
    headers = auth_headers("sportif@example.com")
    goal = client.post("/goals", json={"title": "10 séances", "metric": "séances", "target_value": 10, "unit": "séances"}, headers=headers).json()

    updated = client.patch(f"/goals/{goal['id']}", json={"title": "10 séances", "metric": "séances", "target_value": 10, "current_value": 9, "unit": "séances"}, headers=headers).json()

    assert updated["current_value"] == 0


def test_marking_a_presence_updates_the_goal_and_the_badge(client, db_factory, make_user, auth_headers):
    coach = make_user("coach@example.com", role="coach")
    athlete = make_user("sportif@example.com")
    headers = auth_headers("sportif@example.com")
    client.post("/goals", json={"title": "1 séance", "metric": "séances", "target_value": 1, "unit": "séance"}, headers=headers)
    with db_factory() as db:
        add_presence(db, coach.id, athlete.id, datetime.now(timezone.utc) - timedelta(hours=1))
        db.commit()

    badges = client.get("/statistics/badges", headers=headers).json()["badges"]

    assert next(badge for badge in badges if badge["code"] == "objectif")["earned"] is True
    assert client.get("/goals", headers=headers).json()[0]["current_value"] == 1


def test_the_counting_window_stops_at_the_due_date():
    goal = Goal(title="Octobre", metric="séances", target_value=8, unit="séances", created_at=datetime(2026, 10, 12, 9, 0), due_date=date(2026, 10, 20))

    start, end = session_goal_window(goal, now=datetime(2026, 11, 3, tzinfo=timezone.utc))

    # 1er octobre 00:00 à Paris = 30 septembre 22:00 UTC ; fin du 20 octobre à Paris = 21:59 UTC.
    assert start == datetime(2026, 9, 30, 22, 0, tzinfo=timezone.utc)
    assert (end.date(), end.hour) == (date(2026, 10, 20), 21)


def test_sync_only_writes_when_something_changed(db_factory, make_user):
    athlete = make_user("sportif@example.com")
    with db_factory() as db:
        db.add(Goal(user_id=athlete.id, title="Séances", metric="séances", target_value=4, current_value=0, unit="séances"))
        db.commit()
        sync_session_goals(db, athlete.id)
        assert not db.dirty
