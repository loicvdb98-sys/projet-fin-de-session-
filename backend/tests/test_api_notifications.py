"""Tests d'API des notifications : marquage comme lu, une par une ou toutes à la fois."""

from app.models import Notification


def add_notifications(db_factory, user_id: int, *read_flags: bool) -> list[int]:
    with db_factory() as db:
        items = [Notification(user_id=user_id, title=f"Notification {i}", message="Message de test", kind="info", is_read=flag) for i, flag in enumerate(read_flags)]
        db.add_all(items)
        db.commit()
        return [item.id for item in items]


def test_mark_all_read_only_touches_own_unread_notifications(client, db_factory, make_user, auth_headers):
    me = make_user("sportif@example.com")
    other = make_user("autre@example.com")
    add_notifications(db_factory, me.id, False, False, True)
    add_notifications(db_factory, other.id, False)
    headers = auth_headers("sportif@example.com")

    response = client.post("/notifications/read-all", headers=headers)

    assert response.status_code == 200
    assert response.json() == {"updated": 2}
    assert all(item["is_read"] for item in client.get("/notifications", headers=headers).json())
    assert not client.get("/notifications", headers=auth_headers("autre@example.com")).json()[0]["is_read"]


def test_cannot_mark_someone_else_notification(client, db_factory, make_user, auth_headers):
    make_user("sportif@example.com")
    other = make_user("autre@example.com")
    [notification_id] = add_notifications(db_factory, other.id, False)

    assert client.patch(f"/notifications/{notification_id}/read", headers=auth_headers("sportif@example.com")).status_code == 404
