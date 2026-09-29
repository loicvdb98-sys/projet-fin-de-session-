"""Tests d'API : suppression des records et des entrées de journal, commentaire du coach."""

from datetime import datetime, timedelta, timezone

from app.models import Participation, Session as SportSession


def past_session(db_factory, coach_id: int, athlete_id: int) -> int:
    """Crée une séance passée du coach à laquelle le sportif a participé, et renvoie son id."""
    with db_factory() as db:
        session = SportSession(title="Séance", starts_at=datetime.now(timezone.utc) - timedelta(days=1), coach_id=coach_id)
        db.add(session)
        db.flush()
        db.add(Participation(user_id=athlete_id, session_id=session.id, status="present"))
        db.commit()
        return session.id


def test_owner_can_delete_record(client, make_user, auth_headers):
    make_user("sportif@example.com")
    headers = auth_headers("sportif@example.com")
    record = client.post("/records", json={"exercise_name": "Squat", "value": 100, "unit": "kg"}, headers=headers).json()

    assert client.delete(f"/records/{record['id']}", headers=headers).status_code == 204
    assert client.get("/records", headers=headers).json() == []


def test_cannot_delete_someone_else_record(client, make_user, auth_headers):
    make_user("sportif@example.com")
    make_user("autre@example.com")
    record = client.post("/records", json={"exercise_name": "Squat", "value": 100, "unit": "kg"}, headers=auth_headers("sportif@example.com")).json()

    assert client.delete(f"/records/{record['id']}", headers=auth_headers("autre@example.com")).status_code == 404


def test_sportif_can_edit_and_delete_own_journal_entry(client, db_factory, make_user, auth_headers):
    coach = make_user("coach@example.com", role="coach")
    sportif = make_user("sportif@example.com")
    session_id = past_session(db_factory, coach.id, sportif.id)
    headers = auth_headers("sportif@example.com")
    entry = client.post("/journal", json={"session_id": session_id, "fatigue": 6, "mood": "bien"}, headers=headers).json()

    updated = client.patch(f"/journal/{entry['id']}", json={"fatigue": 3, "notes": "Mieux que prévu"}, headers=headers).json()
    assert (updated["fatigue"], updated["notes"]) == (3, "Mieux que prévu")

    assert client.delete(f"/journal/{entry['id']}", headers=headers).status_code == 204
    assert client.get("/journal", headers=headers).json() == []


def test_coach_can_comment_but_not_delete_athlete_entry(client, db_factory, make_user, auth_headers):
    coach = make_user("coach@example.com", role="coach")
    sportif = make_user("sportif@example.com")
    session_id = past_session(db_factory, coach.id, sportif.id)
    entry = client.post("/journal", json={"session_id": session_id, "fatigue": 6, "mood": "bien"}, headers=auth_headers("sportif@example.com")).json()
    coach_headers = auth_headers("coach@example.com")

    commented = client.patch(f"/journal/{entry['id']}", json={"coach_comment": "Beau travail", "fatigue": 1}, headers=coach_headers).json()
    assert commented["coach_comment"] == "Beau travail"
    assert commented["fatigue"] == 6  # le coach ne modifie que son commentaire

    assert client.delete(f"/journal/{entry['id']}", headers=coach_headers).status_code == 403
