"""Tests d'API des objectifs : mise à jour de la progression, réservée au propriétaire."""

GOAL = {"title": "Terminer 12 séances", "metric": "séances", "target_value": 12, "current_value": 0, "unit": "séances"}


def test_owner_can_update_goal_progress(client, make_user, auth_headers):
    make_user("sportif@example.com")
    headers = auth_headers("sportif@example.com")
    goal = client.post("/goals", json=GOAL, headers=headers).json()

    response = client.patch(f"/goals/{goal['id']}", json={**GOAL, "current_value": 5}, headers=headers)

    assert response.status_code == 200
    assert response.json()["current_value"] == 5


def test_cannot_update_someone_else_goal(client, make_user, auth_headers):
    make_user("sportif@example.com")
    make_user("autre@example.com")
    goal = client.post("/goals", json=GOAL, headers=auth_headers("sportif@example.com")).json()

    response = client.patch(f"/goals/{goal['id']}", json={**GOAL, "current_value": 12}, headers=auth_headers("autre@example.com"))

    assert response.status_code == 404


def test_goal_progress_cannot_be_negative(client, make_user, auth_headers):
    make_user("sportif@example.com")
    headers = auth_headers("sportif@example.com")
    goal = client.post("/goals", json=GOAL, headers=headers).json()

    assert client.patch(f"/goals/{goal['id']}", json={**GOAL, "current_value": -1}, headers=headers).status_code == 422
