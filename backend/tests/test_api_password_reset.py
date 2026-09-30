"""Tests d'API du « mot de passe oublié » : lien à usage unique et limité dans le temps,
réponse identique pour un email inconnu, lien pointant uniquement vers une origine autorisée."""

from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import pytest
from sqlalchemy import update

from app.config import get_settings
from app.models.password_reset import PasswordResetToken
from app.routers import auth as auth_router
from app.services import email as email_service
from conftest import TEST_PASSWORD

NEW_PASSWORD = "NouveauDepart2026"


@pytest.fixture
def outbox(monkeypatch):
    """Emails « envoyés » par l'API pendant le test (destinataire, objet, corps)."""
    sent: list[tuple[str, str, str]] = []
    monkeypatch.setattr(auth_router, "send_email", lambda to, subject, body: sent.append((to, subject, body)))
    return sent


def link_in(body: str) -> str:
    return next(word for word in body.split() if "/reset-password?token=" in word)


def token_from(body: str) -> str:
    return parse_qs(urlparse(link_in(body)).query)["token"][0]


def forgot(client, email: str, origin: str | None = None):
    return client.post("/auth/forgot-password", json={"email": email}, headers={"Origin": origin} if origin else {})


def test_unknown_and_known_emails_get_the_same_answer(client, make_user, outbox):
    make_user("existe@example.com")

    known = forgot(client, "existe@example.com")
    unknown = forgot(client, "inconnu@example.com")

    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert [to for to, _, _ in outbox] == ["existe@example.com"]


def test_the_link_sets_a_new_password_once_and_closes_sessions(client, make_user, outbox):
    make_user("oubli@example.com")
    old_refresh = client.post("/auth/login", data={"username": "oubli@example.com", "password": TEST_PASSWORD}).json()["refresh_token"]
    forgot(client, "oubli@example.com")
    token = token_from(outbox[0][2])

    assert client.post("/auth/reset-password", json={"token": token, "new_password": NEW_PASSWORD}).status_code == 204

    assert client.post("/auth/login", data={"username": "oubli@example.com", "password": NEW_PASSWORD}).status_code == 200
    assert client.post("/auth/login", data={"username": "oubli@example.com", "password": TEST_PASSWORD}).status_code == 401
    assert client.post("/auth/refresh", json={"refresh_token": old_refresh}).status_code == 401
    # Usage unique.
    assert client.post("/auth/reset-password", json={"token": token, "new_password": "EncoreAutre2026x"}).status_code == 400


def test_an_expired_link_is_refused(client, make_user, outbox, db_factory):
    make_user("lent@example.com")
    forgot(client, "lent@example.com")
    with db_factory() as db:
        db.execute(update(PasswordResetToken).values(expires_at=datetime.now(timezone.utc) - timedelta(minutes=1)))
        db.commit()

    response = client.post("/auth/reset-password", json={"token": token_from(outbox[0][2]), "new_password": NEW_PASSWORD})

    assert response.status_code == 400


def test_a_new_request_cancels_the_previous_link(client, make_user, outbox):
    make_user("double@example.com")
    forgot(client, "double@example.com")
    forgot(client, "double@example.com")
    first, second = token_from(outbox[0][2]), token_from(outbox[1][2])

    assert client.post("/auth/reset-password", json={"token": first, "new_password": NEW_PASSWORD}).status_code == 400
    assert client.post("/auth/reset-password", json={"token": second, "new_password": NEW_PASSWORD}).status_code == 204


def test_reset_requires_a_strong_password(client, make_user, outbox):
    make_user("faible@example.com")
    forgot(client, "faible@example.com")

    response = client.post("/auth/reset-password", json={"token": token_from(outbox[0][2]), "new_password": "toutenminuscules"})

    assert response.status_code == 422


def test_reset_unlocks_an_account_blocked_by_failed_logins(client, make_user, outbox):
    make_user("bloque@example.com")
    for _ in range(5):
        client.post("/auth/login", data={"username": "bloque@example.com", "password": "MauvaisMotDePasse1"})
    assert client.post("/auth/login", data={"username": "bloque@example.com", "password": TEST_PASSWORD}).status_code == 429
    forgot(client, "bloque@example.com")

    client.post("/auth/reset-password", json={"token": token_from(outbox[0][2]), "new_password": NEW_PASSWORD})

    assert client.post("/auth/login", data={"username": "bloque@example.com", "password": NEW_PASSWORD}).status_code == 200


def test_the_link_points_to_an_allowed_origin_only(client, make_user, outbox):
    make_user("lien@example.com")

    forgot(client, "lien@example.com", origin="http://127.0.0.1:4200")
    forgot(client, "lien@example.com", origin="https://site-pirate.example")

    assert link_in(outbox[0][2]).startswith("http://127.0.0.1:4200/reset-password?token=")
    assert link_in(outbox[1][2]).startswith(f"{get_settings().frontend_url}/reset-password?token=")


def test_requests_for_one_address_are_limited(client, make_user, outbox):
    make_user("spam@example.com")
    for _ in range(3):
        assert forgot(client, "spam@example.com").status_code == 202

    assert forgot(client, "spam@example.com").status_code == 429


def test_email_goes_through_smtp_when_configured(monkeypatch):
    sent = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            sent.append(("connexion", host, port))
        def __enter__(self):
            return self
        def __exit__(self, *_):
            return False
        def starttls(self):
            sent.append(("starttls",))
        def login(self, user, password):
            sent.append(("login", user))
        def send_message(self, message):
            sent.append(("envoi", message["To"], message["Subject"]))

    settings = get_settings()
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "smtp_user", "sportplan")
    monkeypatch.setattr(settings, "smtp_password", "secret")
    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSMTP)

    email_service.send_email("alex@example.com", "Sujet", "Corps")

    assert sent == [("connexion", "smtp.example.com", 587), ("starttls",), ("login", "sportplan"), ("envoi", "alex@example.com", "Sujet")]
