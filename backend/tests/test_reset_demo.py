"""Test du script reset_demo.py : il supprime toutes les données des comptes @sportplan.dev,
y compris celles des tables ajoutées ensuite (liste d'attente, liens de réinitialisation),
sans toucher aux autres comptes."""

from datetime import datetime, timedelta, timezone

import reset_demo
from app.models import Participation, PasswordResetToken, RefreshToken, Session as SportSession, User, WaitlistEntry


def test_reset_removes_every_demo_row_and_keeps_real_accounts(db_factory, make_user, monkeypatch):
    coach = make_user("coach.demo@sportplan.dev", role="coach")
    athlete = make_user("sportif.demo@sportplan.dev")
    other = make_user("vraie.personne@example.com")
    in_two_days = datetime.now(timezone.utc) + timedelta(days=2)
    with db_factory() as db:
        session = SportSession(title="Démo", starts_at=in_two_days, coach_id=coach.id, capacity=1)
        db.add(session)
        db.flush()
        db.add_all([
            Participation(user_id=athlete.id, session_id=session.id),
            WaitlistEntry(user_id=other.id, session_id=session.id),
            PasswordResetToken(token_hash="a" * 64, user_id=athlete.id, expires_at=in_two_days),
            RefreshToken(token_hash="b" * 64, user_id=athlete.id, expires_at=in_two_days),
        ])
        db.commit()
    monkeypatch.setattr(reset_demo, "SessionLocal", db_factory)

    reset_demo.run_reset()

    with db_factory() as db:
        assert [user.email for user in db.query(User)] == ["vraie.personne@example.com"]
        for model in (SportSession, Participation, WaitlistEntry, PasswordResetToken, RefreshToken):
            assert db.query(model).count() == 0, model.__name__
