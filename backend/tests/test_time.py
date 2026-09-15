from datetime import datetime, timedelta, timezone

from app.services.time import is_past


def test_is_past_detects_past_datetime():
    assert is_past(datetime.now(timezone.utc) - timedelta(minutes=1))


def test_is_past_accepts_future_datetime():
    assert not is_past(datetime.now(timezone.utc) + timedelta(minutes=1))
