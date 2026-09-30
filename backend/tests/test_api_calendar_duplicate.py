"""Tests d'API de l'export agenda (.ics) et de la duplication d'une séance."""

from datetime import datetime, timedelta, timezone

import pytest

from app.models import Exercise, Participation, Session as SportSession


def add_session(db_factory, coach_id: int, days: float, title: str = "Circuit", exercises: int = 0) -> int:
    with db_factory() as db:
        session = SportSession(
            title=title, description="Échauffement, puis circuit", coach_id=coach_id,
            starts_at=datetime.now(timezone.utc).replace(microsecond=0) + timedelta(days=days),
            exercises=[Exercise(name=f"Exercice {index}", sets=3, repetitions=10, rest_seconds=60) for index in range(exercises)],
        )
        db.add(session)
        db.commit()
        return session.id


def register(db_factory, user_id: int, session_id: int, status: str = "inscrit") -> None:
    with db_factory() as db:
        db.add(Participation(user_id=user_id, session_id=session_id, status=status))
        db.commit()


@pytest.fixture
def people(make_user):
    return {
        "coach": make_user("coach@example.com", role="coach", full_name="Camille Coach"),
        "other_coach": make_user("autre.coach@example.com", role="coach"),
        "sportif": make_user("sportif@example.com"),
    }


# --- Export agenda -----------------------------------------------------------

def test_a_session_exports_as_an_ics_event_with_a_reminder(client, db_factory, people):
    session_id = add_session(db_factory, people["coach"].id, 2, title="Yoga, souplesse; récupération")

    response = client.get(f"/sessions/{session_id}/calendar.ics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/calendar")
    assert f'sportplan-seance-{session_id}.ics' in response.headers["content-disposition"]
    body = response.text
    assert body.startswith("BEGIN:VCALENDAR\r\n") and body.endswith("END:VCALENDAR\r\n")
    assert "SUMMARY:Yoga\\, souplesse\\; récupération" in body
    assert "Coach : Camille Coach" in body
    assert "TRIGGER:-PT60M" in body
    assert all(len(line.encode("utf-8")) <= 75 for line in body.split("\r\n"))


def test_my_calendar_only_lists_upcoming_sessions_where_i_am_expected(client, db_factory, people, auth_headers):
    coach, athlete = people["coach"].id, people["sportif"].id
    registered = add_session(db_factory, coach, 2, title="Inscrit")
    absent = add_session(db_factory, coach, 3, title="Absent")
    past = add_session(db_factory, coach, -3, title="Passée")
    add_session(db_factory, coach, 4, title="Autre séance")
    register(db_factory, athlete, registered)
    register(db_factory, athlete, absent, status="absent")
    register(db_factory, athlete, past, status="present")

    athlete_body = client.get("/sessions/calendar.ics", headers=auth_headers("sportif@example.com")).text
    coach_body = client.get("/sessions/calendar.ics", headers=auth_headers("coach@example.com")).text

    assert [line for line in athlete_body.split("\r\n") if line.startswith("SUMMARY")] == ["SUMMARY:Inscrit"]
    # Le coach retrouve toutes les séances à venir qu'il anime.
    assert coach_body.count("BEGIN:VEVENT") == 3


def test_my_calendar_requires_authentication(client):
    assert client.get("/sessions/calendar.ics").status_code == 401


# --- Duplication ---------------------------------------------------------------

def test_coach_duplicates_a_session_one_week_later_with_its_exercises(client, db_factory, people, auth_headers):
    source_id = add_session(db_factory, people["coach"].id, 2, exercises=3)
    register(db_factory, people["sportif"].id, source_id)
    source = client.get(f"/sessions/{source_id}").json()

    response = client.post(f"/sessions/{source_id}/duplicate", json={}, headers=auth_headers("coach@example.com"))

    assert response.status_code == 201
    copy = response.json()
    assert copy["id"] != source_id and copy["title"] == source["title"]
    assert datetime.fromisoformat(copy["starts_at"]) - datetime.fromisoformat(source["starts_at"]) == timedelta(weeks=1)
    assert copy["registered_count"] == 0
    assert len(client.get(f"/sessions/{copy['id']}/exercises/").json()) == 3


def test_duplicating_a_past_session_lands_on_the_next_upcoming_week(client, db_factory, people, auth_headers):
    source_id = add_session(db_factory, people["coach"].id, -10)

    copy = client.post(f"/sessions/{source_id}/duplicate", headers=auth_headers("coach@example.com")).json()

    starts_at = datetime.fromisoformat(copy["starts_at"])
    starts_at = starts_at if starts_at.tzinfo else starts_at.replace(tzinfo=timezone.utc)
    assert timedelta(0) < starts_at - datetime.now(timezone.utc) <= timedelta(weeks=1)


def test_duplicate_with_an_explicit_offset_must_stay_in_the_future(client, db_factory, people, auth_headers):
    source_id = add_session(db_factory, people["coach"].id, -3)

    response = client.post(f"/sessions/{source_id}/duplicate", json={"days": 1}, headers=auth_headers("coach@example.com"))

    assert response.status_code == 400


def test_only_the_session_coach_or_an_admin_can_duplicate(client, db_factory, people, auth_headers):
    source_id = add_session(db_factory, people["coach"].id, 2)

    assert client.post(f"/sessions/{source_id}/duplicate", headers=auth_headers("autre.coach@example.com")).status_code == 403
    assert client.post(f"/sessions/{source_id}/duplicate", headers=auth_headers("sportif@example.com")).status_code == 403


# --- Séances récurrentes -------------------------------------------------------

def test_coach_repeats_a_session_every_week(client, db_factory, people, auth_headers):
    source_id = add_session(db_factory, people["coach"].id, 2, exercises=2)
    source_start = datetime.fromisoformat(client.get(f"/sessions/{source_id}").json()["starts_at"])

    response = client.post(f"/sessions/{source_id}/repeat", json={"weeks": 4}, headers=auth_headers("coach@example.com"))

    assert response.status_code == 201
    starts = [datetime.fromisoformat(item["starts_at"]) for item in response.json()]
    assert [start - source_start for start in starts] == [timedelta(weeks=week) for week in range(1, 5)]
    assert all(len(client.get(f"/sessions/{item['id']}/exercises/").json()) == 2 for item in response.json())
    assert len(client.get("/sessions/").json()) == 5


def test_repeating_a_past_session_starts_with_the_next_upcoming_week(client, db_factory, people, auth_headers):
    source_id = add_session(db_factory, people["coach"].id, -10)

    copies = client.post(f"/sessions/{source_id}/repeat", json={"weeks": 2}, headers=auth_headers("coach@example.com")).json()

    first = datetime.fromisoformat(copies[0]["starts_at"])
    first = first if first.tzinfo else first.replace(tzinfo=timezone.utc)
    assert timedelta(0) < first - datetime.now(timezone.utc) <= timedelta(weeks=1)


@pytest.mark.parametrize("weeks", [0, 13])
def test_repeat_is_limited_to_twelve_weeks(client, db_factory, people, auth_headers, weeks):
    source_id = add_session(db_factory, people["coach"].id, 2)

    response = client.post(f"/sessions/{source_id}/repeat", json={"weeks": weeks}, headers=auth_headers("coach@example.com"))

    assert response.status_code == 422


def test_only_the_session_coach_or_an_admin_can_repeat(client, db_factory, people, auth_headers):
    source_id = add_session(db_factory, people["coach"].id, 2)

    assert client.post(f"/sessions/{source_id}/repeat", json={"weeks": 2}, headers=auth_headers("autre.coach@example.com")).status_code == 403
