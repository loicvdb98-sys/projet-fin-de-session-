"""Tests des rappels automatiques de séance (24 h avant, une seule fois par sportif et par séance)."""

from datetime import datetime, timedelta, timezone

from app.config import get_settings
from app.models import Notification, Participation, Session as SportSession, User
from app.models.reminder import SessionReminder
from app.services import reminders as reminders_service
from app.services.reminders import send_due_reminders

# Mardi 10 h (heure de Paris) : 8 h UTC.
NOW = datetime(2026, 10, 6, 8, 0, tzinfo=timezone.utc)


def add_session(db, coach_id: int, starts_at: datetime, registered: list[tuple[int, str]], title: str = "Yoga") -> int:
    session = SportSession(title=title, starts_at=starts_at, coach_id=coach_id)
    db.add(session)
    db.flush()
    db.add_all([Participation(user_id=user_id, session_id=session.id, status=status) for user_id, status in registered])
    db.commit()
    return session.id


def titles(db, user_id: int) -> list[str]:
    return [note.title for note in db.query(Notification).filter(Notification.user_id == user_id)]


def test_only_registered_athletes_of_sessions_within_24_hours_are_reminded_once(db_factory, make_user):
    coach = make_user("coach@example.com", role="coach", full_name="Camille Coach")
    present, absent = make_user("a@example.com"), make_user("b@example.com")
    with db_factory() as db:
        add_session(db, coach.id, NOW + timedelta(hours=8), [(present.id, "inscrit"), (absent.id, "absent")])  # 18 h le jour même
        add_session(db, coach.id, NOW + timedelta(hours=30), [(present.id, "inscrit")], title="Trop tard")
        add_session(db, coach.id, NOW - timedelta(hours=2), [(present.id, "present")], title="Passée")

        assert send_due_reminders(db, NOW) == 1
        assert send_due_reminders(db, NOW + timedelta(minutes=15)) == 0

        assert titles(db, present.id) == ["Rappel : Yoga aujourd'hui à 18:00"]
        assert titles(db, absent.id) == []
        assert db.query(SessionReminder).count() == 1


def test_a_session_tomorrow_says_tomorrow_and_inactive_accounts_are_skipped(db_factory, make_user):
    coach = make_user("coach@example.com", role="coach")
    athlete, inactive = make_user("a@example.com"), make_user("b@example.com")
    with db_factory() as db:
        db.get(User, inactive.id).is_active = False
        add_session(db, coach.id, NOW + timedelta(hours=20), [(athlete.id, "inscrit"), (inactive.id, "inscrit")])  # mercredi 4 h UTC = 6 h Paris

        send_due_reminders(db, NOW)

        assert titles(db, athlete.id) == ["Rappel : Yoga demain à 06:00"]
        assert titles(db, inactive.id) == []


def test_emails_are_sent_only_with_an_smtp_server(db_factory, make_user, monkeypatch):
    coach = make_user("coach@example.com", role="coach")
    athlete = make_user("a@example.com")
    sent = []
    monkeypatch.setattr(reminders_service, "send_email", lambda to, subject, body: sent.append((to, subject)))
    with db_factory() as db:
        add_session(db, coach.id, NOW + timedelta(hours=3), [(athlete.id, "inscrit")])
        add_session(db, coach.id, NOW + timedelta(hours=4), [(athlete.id, "inscrit")], title="Cardio")

        send_due_reminders(db, NOW)
        assert sent == []

        monkeypatch.setattr(get_settings(), "smtp_host", "smtp.example.com")
        add_session(db, coach.id, NOW + timedelta(hours=5), [(athlete.id, "inscrit")], title="Force")
        send_due_reminders(db, NOW)

        assert sent == [("a@example.com", "SportPlan : rappel de votre séance aujourd'hui à 15:00")]


def test_a_reminded_session_can_still_be_deleted(client, db_factory, make_user, auth_headers):
    coach = make_user("coach@example.com", role="coach")
    athlete = make_user("a@example.com")
    with db_factory() as db:
        session_id = add_session(db, coach.id, datetime.now(timezone.utc) + timedelta(hours=5), [(athlete.id, "inscrit")])
        send_due_reminders(db)

    assert client.delete(f"/sessions/{session_id}", headers=auth_headers("coach@example.com")).status_code == 204
    with db_factory() as db:
        assert db.query(SessionReminder).count() == 0
