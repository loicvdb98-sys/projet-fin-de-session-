from datetime import timedelta

from app.security import (
    create_access_token,
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
    from jose import JWTError
    from app.security import create_token

    token = create_token("42", "access", timedelta(seconds=-1))

    try:
        decode_token(token)
    except JWTError:
        pass
    else:
        raise AssertionError("An expired token must be rejected")
