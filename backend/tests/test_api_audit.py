"""Tests du journal d'activité : événements de sécurité enregistrés et page réservée aux admins."""

from datetime import datetime, timedelta, timezone

from app.models.audit import AuditEvent
from app.services.audit import purge_old_events
from conftest import TEST_PASSWORD


def actions(client, headers, **params):
    return [event["action"] for event in client.get("/admin/audit", headers=headers, params=params).json()]


def test_logins_are_recorded_with_the_ip_and_a_lock_is_flagged(client, make_user, auth_headers):
    make_user("admin@example.com", role="admin")
    athlete = make_user("cible@example.com")
    for _ in range(5):
        client.post("/auth/login", data={"username": "cible@example.com", "password": "MauvaisMotDePasse1"})
    headers = auth_headers("admin@example.com")

    events = client.get("/admin/audit", headers=headers).json()

    assert [event["action"] for event in events][:3] == ["connexion", "compte_bloque", "connexion_refusee"]
    refused = events[2]
    assert (refused["target_user_id"], refused["target_name"], refused["details"]) == (athlete.id, "Compte Test", "cible@example.com")
    assert refused["ip"] == "testclient"
    assert actions(client, headers).count("connexion_refusee") == 5


def test_admin_changes_to_accounts_are_recorded(client, make_user, auth_headers):
    make_user("admin@example.com", role="admin", full_name="Admin Principal")
    athlete = make_user("promu@example.com", full_name="Léa Martin")
    headers = auth_headers("admin@example.com")

    client.patch(f"/users/{athlete.id}", json={"role": "coach"}, headers=headers)
    client.patch(f"/users/{athlete.id}", json={"is_active": False}, headers=headers)
    client.patch(f"/users/{athlete.id}", json={"is_active": True}, headers=headers)

    events = client.get("/admin/audit", headers=headers).json()
    assert [event["action"] for event in events[:3]] == ["compte_reactive", "compte_desactive", "role_modifie"]
    role_change = events[2]
    assert (role_change["actor_name"], role_change["target_name"], role_change["details"]) == ("Admin Principal", "Léa Martin", "sportif → coach")


def test_password_events_are_recorded(client, make_user, auth_headers):
    make_user("admin@example.com", role="admin")
    make_user("prudent@example.com")
    client.post("/auth/change-password", json={"current_password": TEST_PASSWORD, "new_password": "NouveauMotDePasse2026"}, headers=auth_headers("prudent@example.com"))
    client.post("/auth/forgot-password", json={"email": "prudent@example.com"})

    recorded = actions(client, auth_headers("admin@example.com"))

    assert {"mot_de_passe_change", "reinitialisation_demandee"} <= set(recorded)


def test_the_journal_can_be_filtered_and_is_admin_only(client, make_user, auth_headers):
    make_user("admin@example.com", role="admin")
    make_user("coach@example.com", role="coach")
    headers = auth_headers("admin@example.com")
    client.post("/auth/login", data={"username": "inconnu@example.com", "password": "MauvaisMotDePasse1"})

    assert set(actions(client, headers, action="connexion_refusee")) == {"connexion_refusee"}
    assert client.get("/admin/audit", headers=auth_headers("coach@example.com")).status_code == 403
    assert client.get("/admin/audit").status_code == 401


def test_events_older_than_180_days_are_purged(db_factory):
    with db_factory() as db:
        db.add_all([
            AuditEvent(action="connexion", created_at=datetime.now(timezone.utc) - timedelta(days=200)),
            AuditEvent(action="connexion", created_at=datetime.now(timezone.utc) - timedelta(days=10)),
        ])
        db.commit()

        assert purge_old_events(db) == 1
        db.commit()
        assert db.query(AuditEvent).count() == 1
