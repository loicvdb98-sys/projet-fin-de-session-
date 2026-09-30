"""Tests d'API des règles métier des séances et des inscriptions."""

from datetime import datetime, timedelta, timezone

import pytest

from app.models import Participation, Session as SportSession


def iso(days: float) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def new_session(db_factory, coach_id: int, days: float, capacity: int = 10) -> int:
    with db_factory() as db:
        session = SportSession(title="Séance", starts_at=datetime.now(timezone.utc) + timedelta(days=days), coach_id=coach_id, capacity=capacity)
        db.add(session)
        db.commit()
        return session.id


@pytest.fixture
def people(make_user):
    """Un admin, deux coachs et deux sportifs."""
    return {
        "admin": make_user("admin@example.com", role="admin"),
        "coach": make_user("coach@example.com", role="coach"),
        "other_coach": make_user("autre.coach@example.com", role="coach"),
        "sportif": make_user("sportif@example.com"),
        "other_sportif": make_user("autre.sportif@example.com"),
    }


# --- Séances ---------------------------------------------------------------

def test_coach_creates_own_session(client, people, auth_headers):
    body = {"title": "Circuit", "starts_at": iso(2), "coach_id": people["coach"].id}
    response = client.post("/sessions/", json=body, headers=auth_headers("coach@example.com"))

    assert response.status_code == 201
    assert response.json()["coach_name"] == people["coach"].full_name


def test_sportif_cannot_create_session(client, people, auth_headers):
    body = {"title": "Circuit", "starts_at": iso(2), "coach_id": people["sportif"].id}
    assert client.post("/sessions/", json=body, headers=auth_headers("sportif@example.com")).status_code == 403


def test_coach_cannot_create_session_for_another_coach(client, people, auth_headers):
    body = {"title": "Circuit", "starts_at": iso(2), "coach_id": people["other_coach"].id}
    assert client.post("/sessions/", json=body, headers=auth_headers("coach@example.com")).status_code == 403


def test_session_must_be_in_the_future(client, people, auth_headers):
    body = {"title": "Circuit", "starts_at": iso(-1), "coach_id": people["coach"].id}
    assert client.post("/sessions/", json=body, headers=auth_headers("coach@example.com")).status_code == 400


def test_coach_cannot_edit_or_cancel_another_coach_session(client, db_factory, people, auth_headers):
    session_id = new_session(db_factory, people["other_coach"].id, days=3)
    headers = auth_headers("coach@example.com")

    assert client.patch(f"/sessions/{session_id}", json={"title": "Piratée"}, headers=headers).status_code == 403
    assert client.delete(f"/sessions/{session_id}", headers=headers).status_code == 403


def test_admin_can_cancel_any_session(client, db_factory, people, auth_headers):
    session_id = new_session(db_factory, people["coach"].id, days=3)
    assert client.delete(f"/sessions/{session_id}", headers=auth_headers("admin@example.com")).status_code == 204


def test_past_session_cannot_be_modified(client, db_factory, people, auth_headers):
    session_id = new_session(db_factory, people["coach"].id, days=-2)
    assert client.patch(f"/sessions/{session_id}", json={"title": "Trop tard"}, headers=auth_headers("coach@example.com")).status_code == 409


# --- Inscriptions -----------------------------------------------------------

def register(client, headers, user_id: int, session_id: int):
    return client.post("/participations/", json={"user_id": user_id, "session_id": session_id}, headers=headers)


def test_sportif_registers_self_but_not_others(client, db_factory, people, auth_headers):
    session_id = new_session(db_factory, people["coach"].id, days=2)
    headers = auth_headers("sportif@example.com")

    assert register(client, headers, people["sportif"].id, session_id).status_code == 201
    assert register(client, headers, people["other_sportif"].id, session_id).status_code == 403


def test_registration_refused_twice_when_full_or_past(client, db_factory, people, auth_headers):
    full_session = new_session(db_factory, people["coach"].id, days=2, capacity=1)
    past_session = new_session(db_factory, people["coach"].id, days=-1)
    headers = auth_headers("sportif@example.com")

    assert register(client, headers, people["sportif"].id, full_session).status_code == 201
    assert register(client, headers, people["sportif"].id, full_session).status_code == 409  # déjà inscrit (et complet)
    assert register(client, auth_headers("autre.sportif@example.com"), people["other_sportif"].id, full_session).status_code == 409  # complet
    assert register(client, headers, people["sportif"].id, past_session).status_code == 409  # séance passée


def test_only_session_coach_marks_attendance(client, db_factory, people, auth_headers):
    session_id = new_session(db_factory, people["coach"].id, days=-1)
    with db_factory() as db:
        participation = Participation(user_id=people["sportif"].id, session_id=session_id, status="absent")
        db.add(participation)
        db.commit()
        participation_id = participation.id

    # Le sportif ne peut pas effacer son absence, ni un autre coach modifier la présence.
    assert client.patch(f"/participations/{participation_id}", json={"status": "inscrit"}, headers=auth_headers("sportif@example.com")).status_code == 403
    assert client.patch(f"/participations/{participation_id}", json={"status": "inscrit"}, headers=auth_headers("autre.coach@example.com")).status_code == 403
    # Le coach de la séance, lui, marque la présence.
    response = client.patch(f"/participations/{participation_id}", json={"status": "present"}, headers=auth_headers("coach@example.com"))
    assert response.status_code == 200
    assert response.json()["status"] == "present"


def test_cannot_unregister_after_session_started(client, db_factory, people, auth_headers):
    session_id = new_session(db_factory, people["coach"].id, days=-1)
    with db_factory() as db:
        participation = Participation(user_id=people["sportif"].id, session_id=session_id, status="inscrit")
        db.add(participation)
        db.commit()
        participation_id = participation.id

    assert client.delete(f"/participations/{participation_id}", headers=auth_headers("sportif@example.com")).status_code == 409


def test_coach_cannot_register_to_own_session(client, db_factory, people, auth_headers):
    session_id = new_session(db_factory, people["coach"].id, days=2)

    response = register(client, auth_headers("coach@example.com"), people["coach"].id, session_id)

    assert response.status_code == 409


# --- Pointage groupé ---------------------------------------------------------

def test_coach_marks_every_unmarked_athlete_present_at_once(client, db_factory, people, auth_headers):
    session_id = new_session(db_factory, people["coach"].id, days=-0.1)
    with db_factory() as db:
        db.add_all([
            Participation(user_id=people["sportif"].id, session_id=session_id),
            Participation(user_id=people["other_sportif"].id, session_id=session_id, status="absent"),
        ])
        db.commit()

    response = client.post(f"/sessions/{session_id}/attendance", json={"status": "present"}, headers=auth_headers("coach@example.com"))

    assert response.json() == {"updated": 1}
    statuses = {item["user_id"]: item["status"] for item in client.get("/participations/", headers=auth_headers("coach@example.com")).json()}
    assert statuses == {people["sportif"].id: "present", people["other_sportif"].id: "absent"}


def test_bulk_attendance_waits_for_the_session_and_its_coach(client, db_factory, people, auth_headers):
    upcoming = new_session(db_factory, people["coach"].id, days=2)
    started = new_session(db_factory, people["coach"].id, days=-0.1)

    assert client.post(f"/sessions/{upcoming}/attendance", json={"status": "present"}, headers=auth_headers("coach@example.com")).status_code == 409
    assert client.post(f"/sessions/{started}/attendance", json={"status": "present"}, headers=auth_headers("autre.coach@example.com")).status_code == 403
    assert client.post(f"/sessions/{started}/attendance", json={"status": "present"}, headers=auth_headers("sportif@example.com")).status_code == 403
    assert client.post(f"/sessions/{started}/attendance", json={"status": "inscrit"}, headers=auth_headers("coach@example.com")).status_code == 422
