from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.config import get_settings
from app.security import (
    TokenError,
    create_access_token,
    create_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_is_not_plaintext_and_verifies():
    password = "SportPlanTest2026!"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_contains_subject_and_type():
    token = create_access_token("42")
    payload = decode_token(token)

    assert payload["sub"] == "42"
    assert payload["type"] == "access"


def test_expired_token_is_rejected():
    token = create_token("42", "access", timedelta(seconds=-1))

    with pytest.raises(TokenError):
        decode_token(token)


def test_two_tokens_issued_in_the_same_second_are_different():
    assert create_access_token("42") != create_access_token("42")


def test_unsigned_token_is_rejected():
    now = datetime.now(timezone.utc)
    forged = jwt.encode({"sub": "1", "type": "access", "iat": now, "exp": now + timedelta(minutes=5)}, key=None, algorithm="none")

    with pytest.raises(TokenError):
        decode_token(forged)


def test_token_signed_with_another_key_is_rejected():
    now = datetime.now(timezone.utc)
    forged = jwt.encode({"sub": "1", "type": "access", "iat": now, "exp": now + timedelta(minutes=5)}, "une-autre-cle-secrete-de-32-caracteres!", algorithm="HS256")

    with pytest.raises(TokenError):
        decode_token(forged)


def test_token_without_type_is_rejected():
    now = datetime.now(timezone.utc)
    incomplete = jwt.encode({"sub": "1", "iat": now, "exp": now + timedelta(minutes=5)}, get_settings().secret_key, algorithm="HS256")

    with pytest.raises(TokenError):
        decode_token(incomplete)
