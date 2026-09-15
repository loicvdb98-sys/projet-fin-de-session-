import pytest
from pydantic import ValidationError

from app.schemas.goals import GoalCreate
from app.schemas.journal import JournalCreate
from app.schemas.program import ProgramCreate


def test_goal_rejects_negative_target():
    with pytest.raises(ValidationError):
        GoalCreate(title="Force", metric="charge", target_value=0, unit="kg")


def test_journal_accepts_valid_fatigue_range():
    journal = JournalCreate(session_id=4, fatigue=8, mood="moyen")

    assert journal.session_id == 4
    assert journal.fatigue == 8


def test_journal_rejects_invalid_fatigue():
    with pytest.raises(ValidationError):
        JournalCreate(session_id=4, fatigue=11)


def test_program_limits_week_count():
    with pytest.raises(ValidationError):
        ProgramCreate(name="Plan", weeks=53)
