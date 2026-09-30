"""Tests des badges et des séries de semaines d'entraînement (calcul et route /statistics/badges)."""

from datetime import date, datetime, timedelta, timezone

from app.models import Goal, Participation, PersonalRecord, Session as SportSession
from app.services.badges import compute_badges, weekly_streaks

WEDNESDAY = date(2026, 9, 30)


def weeks_ago(weeks: int, weekday: int = 1) -> date:
    """Un jour de la semaine située `weeks` semaines avant celle de WEDNESDAY (0 = lundi)."""
    monday = WEDNESDAY - timedelta(days=WEDNESDAY.weekday()) - timedelta(weeks=weeks)
    return monday + timedelta(days=weekday)


def test_streak_counts_consecutive_weeks_up_to_last_week():
    days = [weeks_ago(1), weeks_ago(2), weeks_ago(2, 4), weeks_ago(3), weeks_ago(6)]

    current, best, fourth = weekly_streaks(days, WEDNESDAY)

    assert (current, best, fourth) == (3, 3, None)


def test_streak_is_lost_after_a_full_week_without_training():
    current, best, fourth = weekly_streaks([weeks_ago(2), weeks_ago(3), weeks_ago(4), weeks_ago(5)], WEDNESDAY)

    assert (current, best) == (0, 4)
    assert fourth == weeks_ago(2, 0)


def test_badges_follow_presences_goals_records_and_journal():
    statuses = [(weeks_ago(week), "present") for week in range(12, 0, -1)] + [(weeks_ago(0, 0), "absent")]

    badges, current, best = compute_badges(statuses, goals_completed=1, record_days=[weeks_ago(5)], journal_days=[weeks_ago(1)] * 2, today=WEDNESDAY)

    by_code = {badge.code: badge for badge in badges}
    assert by_code["premiere-seance"].earned and by_code["premiere-seance"].earned_at == weeks_ago(12)
    assert by_code["habitue"].earned and by_code["habitue"].earned_at == weeks_ago(3)
    assert (by_code["pilier"].earned, by_code["pilier"].progress) == (False, 12)
    assert by_code["regularite"].earned and best == 12
    # La dernière séance est une absence : la série « sans faute » repart de zéro.
    assert by_code["sans-faute"].progress == 0
    assert by_code["objectif"].earned and by_code["record"].earned
    assert (by_code["carnet"].earned, by_code["carnet"].progress) == (False, 2)
    assert current == 12


def test_badges_route_reads_the_connected_user_data(client, db_factory, make_user, auth_headers):
    coach = make_user("coach@example.com", role="coach")
    athlete = make_user("sportif@example.com")
    with db_factory() as db:
        now = datetime.now(timezone.utc)
        for days_ago in (20, 13, 6):
            session = SportSession(title="Séance", starts_at=now - timedelta(days=days_ago), coach_id=coach.id)
            db.add(session)
            db.flush()
            db.add(Participation(user_id=athlete.id, session_id=session.id, status="present"))
        db.add(Goal(user_id=athlete.id, title="10 km", metric="distance", target_value=10, current_value=10, unit="km"))
        db.add(PersonalRecord(user_id=athlete.id, exercise_name="Squat", value=100, unit="kg"))
        db.commit()

    body = client.get("/statistics/badges", headers=auth_headers("sportif@example.com")).json()

    earned = {badge["code"] for badge in body["badges"] if badge["earned"]}
    assert earned == {"premiere-seance", "objectif", "record"}
    assert body["earned_count"] == 3
    assert body["best_streak_weeks"] == 3
    habitue = next(badge for badge in body["badges"] if badge["code"] == "habitue")
    assert (habitue["progress"], habitue["target"], habitue["earned_at"]) == (3, 10, None)
