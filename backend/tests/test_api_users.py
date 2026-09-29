"""Tests d'API des permissions sur la modification des comptes (PATCH /users/{id})."""


def test_admin_can_change_another_account_role(client, make_user, auth_headers):
    make_user("admin@example.com", role="admin")
    sportif = make_user("sportif@example.com")

    response = client.patch(f"/users/{sportif.id}", json={"role": "coach"}, headers=auth_headers("admin@example.com"))

    assert response.status_code == 200
    assert response.json()["role"] == "coach"


def test_admin_cannot_remove_own_admin_role(client, make_user, auth_headers):
    admin = make_user("admin@example.com", role="admin")
    headers = auth_headers("admin@example.com")

    assert client.patch(f"/users/{admin.id}", json={"role": "sportif"}, headers=headers).status_code == 403
    assert client.get("/users/me", headers=headers).json()["role"] == "admin"


def test_admin_cannot_deactivate_own_account(client, make_user, auth_headers):
    admin = make_user("admin@example.com", role="admin")

    response = client.patch(f"/users/{admin.id}", json={"is_active": False}, headers=auth_headers("admin@example.com"))

    assert response.status_code == 403


def test_user_can_rename_own_profile(client, make_user, auth_headers):
    sportif = make_user("sportif@example.com")

    response = client.patch(f"/users/{sportif.id}", json={"full_name": "Nouveau Nom"}, headers=auth_headers("sportif@example.com"))

    assert response.status_code == 200
    assert response.json()["full_name"] == "Nouveau Nom"


def test_sportif_cannot_change_own_role(client, make_user, auth_headers):
    sportif = make_user("sportif@example.com")

    assert client.patch(f"/users/{sportif.id}", json={"role": "admin"}, headers=auth_headers("sportif@example.com")).status_code == 403


def test_sportif_cannot_edit_another_account(client, make_user, auth_headers):
    make_user("sportif@example.com")
    other = make_user("autre@example.com")

    assert client.patch(f"/users/{other.id}", json={"full_name": "Pirate"}, headers=auth_headers("sportif@example.com")).status_code == 403
