"""Tests d'API des protections de l'authentification : blocage d'un compte après plusieurs
échecs, changement de mot de passe, fermeture de toutes les sessions et détection de la
réutilisation d'un refresh token."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import update

from app.models.refresh_token import RefreshToken
from conftest import TEST_PASSWORD

NEW_PASSWORD = "NouveauMotDePasse2026"


def login(client, email: str, password: str = TEST_PASSWORD):
    return client.post("/auth/login", data={"username": email, "password": password})


def refresh(client, token: str):
    return client.post("/auth/refresh", json={"refresh_token": token})


def test_account_is_locked_after_five_failures_even_with_the_right_password(client, make_user):
    make_user("cible@example.com")
    for _ in range(5):
        assert login(client, "cible@example.com", "MauvaisMotDePasse1").status_code == 401

    assert login(client, "cible@example.com").status_code == 429


def test_successful_login_resets_the_failure_counter(client, make_user):
    make_user("distrait@example.com")
    for _ in range(4):
        login(client, "distrait@example.com", "MauvaisMotDePasse1")
    assert login(client, "distrait@example.com").status_code == 200

    for _ in range(4):
        login(client, "distrait@example.com", "MauvaisMotDePasse1")
    assert login(client, "distrait@example.com").status_code == 200


def test_unknown_email_gets_the_same_answer_as_a_wrong_password(client, make_user):
    make_user("existe@example.com")

    unknown = login(client, "inconnu@example.com")
    wrong = login(client, "existe@example.com", "MauvaisMotDePasse1")

    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json() == wrong.json()


def test_change_password_rejects_a_weak_new_password(client, make_user, auth_headers):
    make_user("faible@example.com")
    response = client.post(
        "/auth/change-password",
        json={"current_password": TEST_PASSWORD, "new_password": "toutenminuscules"},
        headers=auth_headers("faible@example.com"),
    )

    assert response.status_code == 422


def test_change_password_closes_other_sessions_and_keeps_this_one(client, make_user):
    make_user("prudent@example.com")
    other_device = login(client, "prudent@example.com").json()
    this_device = login(client, "prudent@example.com").json()

    response = client.post(
        "/auth/change-password",
        json={"current_password": TEST_PASSWORD, "new_password": NEW_PASSWORD},
        headers={"Authorization": f"Bearer {this_device['access_token']}"},
    )

    assert response.status_code == 200
    assert refresh(client, other_device["refresh_token"]).status_code == 401
    assert refresh(client, response.json()["refresh_token"]).status_code == 200
    assert login(client, "prudent@example.com", NEW_PASSWORD).status_code == 200


def test_logout_all_revokes_every_refresh_token(client, make_user):
    make_user("partout@example.com")
    phone = login(client, "partout@example.com").json()
    laptop = login(client, "partout@example.com").json()

    response = client.post("/auth/logout-all", headers={"Authorization": f"Bearer {laptop['access_token']}"})

    assert response.status_code == 204
    assert refresh(client, phone["refresh_token"]).status_code == 401
    assert refresh(client, laptop["refresh_token"]).status_code == 401


def test_reusing_a_rotated_refresh_token_within_the_grace_period_is_only_refused(client, make_user):
    make_user("onglets@example.com")
    first = login(client, "onglets@example.com").json()
    second = refresh(client, first["refresh_token"]).json()

    # Deuxième onglet qui présente l'ancien jeton au même moment : refusé, sans fermer la session.
    assert refresh(client, first["refresh_token"]).status_code == 401
    assert refresh(client, second["refresh_token"]).status_code == 200


def test_reusing_an_old_rotated_refresh_token_closes_every_session(client, make_user, db_factory):
    make_user("vol@example.com")
    stolen = login(client, "vol@example.com").json()
    current = refresh(client, stolen["refresh_token"]).json()
    with db_factory() as db:
        # Le jeton volé a été remplacé il y a plus d'une minute.
        db.execute(update(RefreshToken).where(RefreshToken.revoked_at.is_not(None)).values(revoked_at=datetime.now(timezone.utc) - timedelta(minutes=5)))
        db.commit()

    assert refresh(client, stolen["refresh_token"]).status_code == 401
    assert refresh(client, current["refresh_token"]).status_code == 401


def test_deactivating_an_account_revokes_its_refresh_tokens(client, make_user, auth_headers):
    make_user("admin@example.com", role="admin")
    athlete = make_user("desactive@example.com")
    tokens = login(client, "desactive@example.com").json()

    response = client.patch(f"/users/{athlete.id}", json={"is_active": False}, headers=auth_headers("admin@example.com"))

    assert response.status_code == 200
    assert refresh(client, tokens["refresh_token"]).status_code == 401


def test_profile_update_rejects_blank_name_and_unknown_role(client, make_user, auth_headers):
    make_user("admin2@example.com", role="admin")
    athlete = make_user("profil@example.com")
    headers = auth_headers("admin2@example.com")

    assert client.patch(f"/users/{athlete.id}", json={"full_name": "   "}, headers=headers).status_code == 422
    assert client.patch(f"/users/{athlete.id}", json={"role": "superadmin"}, headers=headers).status_code == 422
    assert client.patch(f"/users/{athlete.id}", json={"full_name": "  Léa   Martin "}, headers=headers).json()["full_name"] == "Léa Martin"
