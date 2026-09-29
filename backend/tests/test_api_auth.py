"""Tests d'API de l'inscription : le compte créé est toujours un compte sportif."""

from conftest import TEST_PASSWORD


def register(client, email: str, **extra):
    return client.post("/auth/register", json={"email": email, "full_name": "Nouveau Compte", "password": TEST_PASSWORD, **extra})


def test_register_creates_a_sportif_account(client):
    response = register(client, "nouveau@example.com")

    assert response.status_code == 201
    assert response.json()["role"] == "sportif"


def test_register_refuses_coach_role(client):
    response = register(client, "faux.coach@example.com", role="coach")

    assert response.status_code == 403
    # Aucun compte n'a été créé : la connexion est impossible.
    assert client.post("/auth/login", data={"username": "faux.coach@example.com", "password": TEST_PASSWORD}).status_code == 401


def test_register_refuses_admin_role(client):
    assert register(client, "faux.admin@example.com", role="admin").status_code == 403


def test_register_refuses_duplicate_email(client):
    assert register(client, "double@example.com").status_code == 201
    assert register(client, "double@example.com").status_code == 409
