"""Tests d'API de la liste d'attente : rejoindre une séance complète, inscription automatique
quand une place se libère, et notifications envoyées."""

from datetime import datetime, timedelta, timezone

import pytest

from app.models import Participation, Session as SportSession, User
from app.services.time import local_datetime_label


def full_session(db_factory, coach_id: int, registered: list[int], capacity: int = 1, days: float = 2) -> int:
    with db_factory() as db:
        session = SportSession(title="Yoga", starts_at=datetime.now(timezone.utc) + timedelta(days=days), coach_id=coach_id, capacity=capacity)
        db.add(session)
        db.flush()
        db.add_all([Participation(user_id=user_id, session_id=session.id) for user_id in registered])
        db.commit()
        return session.id


@pytest.fixture
def people(make_user):
    return {
        "coach": make_user("coach@example.com", role="coach"),
        "admin": make_user("admin@example.com", role="admin"),
        "a": make_user("a@example.com"),
        "b": make_user("b@example.com"),
        "c": make_user("c@example.com"),
    }


def join(client, session_id, headers):
    return client.post(f"/sessions/{session_id}/waitlist", headers=headers)


def test_athletes_queue_on_a_full_session_in_arrival_order(client, db_factory, people, auth_headers):
    session_id = full_session(db_factory, people["coach"].id, [people["a"].id])

    first = join(client, session_id, auth_headers("b@example.com"))
    second = join(client, session_id, auth_headers("c@example.com"))

    assert (first.status_code, first.json()["position"]) == (201, 1)
    assert (second.status_code, second.json()["position"]) == (201, 2)
    assert client.get(f"/sessions/{session_id}").json()["waitlist_count"] == 2
    assert client.get("/sessions/waitlist/mine", headers=auth_headers("c@example.com")).json()[0]["position"] == 2


def test_joining_is_refused_when_it_makes_no_sense(client, db_factory, people, auth_headers):
    session_id = full_session(db_factory, people["coach"].id, [people["a"].id])
    open_id = full_session(db_factory, people["coach"].id, [], capacity=5)
    past_id = full_session(db_factory, people["coach"].id, [people["a"].id], days=-1)

    assert join(client, open_id, auth_headers("b@example.com")).status_code == 409  # il reste des places
    assert join(client, session_id, auth_headers("a@example.com")).status_code == 409  # déjà inscrit
    assert join(client, session_id, auth_headers("coach@example.com")).status_code == 409  # anime la séance
    assert join(client, past_id, auth_headers("b@example.com")).status_code == 409  # séance passée
    assert join(client, session_id, auth_headers("b@example.com")).status_code == 201
    assert join(client, session_id, auth_headers("b@example.com")).status_code == 409  # déjà en attente


def test_a_freed_spot_goes_to_the_first_in_line_who_is_notified(client, db_factory, people, auth_headers):
    session_id = full_session(db_factory, people["coach"].id, [people["a"].id])
    join(client, session_id, auth_headers("b@example.com"))
    join(client, session_id, auth_headers("c@example.com"))
    a_headers = auth_headers("a@example.com")
    mine = next(item for item in client.get("/participations/", headers=a_headers).json() if item["session_id"] == session_id)

    assert client.delete(f"/participations/{mine['id']}", headers=a_headers).status_code == 204

    b_headers = auth_headers("b@example.com")
    assert [item["session_id"] for item in client.get("/participations/", headers=b_headers).json()] == [session_id]
    notification = client.get("/notifications", headers=b_headers).json()[0]
    assert notification["title"] == "Place obtenue : Yoga" and notification["kind"] == "success"
    assert client.get("/sessions/waitlist/mine", headers=b_headers).json() == []
    assert client.get("/sessions/waitlist/mine", headers=auth_headers("c@example.com")).json()[0]["position"] == 1


def test_new_spots_added_by_the_coach_go_to_the_waitlist(client, db_factory, people, auth_headers):
    session_id = full_session(db_factory, people["coach"].id, [people["a"].id])
    join(client, session_id, auth_headers("b@example.com"))
    join(client, session_id, auth_headers("c@example.com"))

    response = client.patch(f"/sessions/{session_id}", json={"capacity": 3}, headers=auth_headers("coach@example.com"))

    assert response.json()["registered_count"] == 3
    assert response.json()["waitlist_count"] == 0


def test_a_deactivated_athlete_is_skipped(client, db_factory, people, auth_headers):
    session_id = full_session(db_factory, people["coach"].id, [people["a"].id])
    join(client, session_id, auth_headers("b@example.com"))
    join(client, session_id, auth_headers("c@example.com"))
    with db_factory() as db:
        db.get(User, people["b"].id).is_active = False
        db.commit()

    client.patch(f"/sessions/{session_id}", json={"capacity": 2}, headers=auth_headers("coach@example.com"))

    registered = {item["user_id"] for item in client.get("/participations/", headers=auth_headers("admin@example.com")).json()}
    assert registered == {people["a"].id, people["c"].id}


def test_leaving_the_waitlist(client, db_factory, people, auth_headers):
    session_id = full_session(db_factory, people["coach"].id, [people["a"].id])
    headers = auth_headers("b@example.com")
    join(client, session_id, headers)

    assert client.delete(f"/sessions/{session_id}/waitlist", headers=headers).status_code == 204
    assert client.delete(f"/sessions/{session_id}/waitlist", headers=headers).status_code == 404


def test_cancelling_a_session_warns_the_waitlist_too(client, db_factory, people, auth_headers):
    session_id = full_session(db_factory, people["coach"].id, [people["a"].id])
    join(client, session_id, auth_headers("b@example.com"))

    assert client.delete(f"/sessions/{session_id}", headers=auth_headers("coach@example.com")).status_code == 204

    titles = [item["title"] for item in client.get("/notifications", headers=auth_headers("b@example.com")).json()]
    assert titles == ["Séance annulée : Yoga"]
    assert client.get("/sessions/waitlist/mine", headers=auth_headers("b@example.com")).json() == []


def test_notification_times_are_written_in_paris_time():
    assert local_datetime_label(datetime(2026, 10, 8, 15, 32, tzinfo=timezone.utc)) == "08/10/2026 à 17:32"
    assert local_datetime_label(datetime(2026, 12, 8, 15, 32)) == "08/12/2026 à 16:32"
