import pytest
from pydantic import ValidationError

from app.config import Settings


def test_rejects_a_short_secret_key():
    with pytest.raises(ValidationError):
        Settings(database_url="sqlite://", secret_key="trop-courte")


def test_accepts_a_long_secret_key():
    settings = Settings(database_url="sqlite://", secret_key="x" * 48)

    assert len(settings.secret_key) == 48
