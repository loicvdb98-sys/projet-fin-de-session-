"""Removes every row created by seed.py, and nothing else.

All demo accounts share the @sportplan.dev email domain, which this script uses
to identify exactly what to delete — any account a real user registered (a
different domain) is left untouched. Run this before a real/production use of
the app to get rid of the placeholder "vivant" demo content.

Deletes in dependency order (leaf tables first) so foreign key constraints
never get in the way, then finally removes the demo user accounts themselves.
"""

from sqlalchemy import delete, select

from app.database import SessionLocal
from app.models import (
    Exercise,
    Goal,
    Notification,
    Participation,
    PersonalRecord,
    Performance,
    RefreshToken,
    Session as SportSession,
    TrainingJournal,
    User,
    WorkoutProgram,
)

DEMO_EMAIL_DOMAIN = "@sportplan.dev"


def run_reset() -> None:
    with SessionLocal() as db:
        demo_user_ids = [
            user.id for user in db.scalars(select(User).where(User.email.like(f"%{DEMO_EMAIL_DOMAIN}")))
        ]
        if not demo_user_ids:
            print("Aucun compte de démonstration trouvé (rien à faire).")
            return

        demo_session_ids = [
            session.id for session in db.scalars(select(SportSession).where(SportSession.coach_id.in_(demo_user_ids)))
        ]

        db.execute(delete(TrainingJournal).where(
            TrainingJournal.user_id.in_(demo_user_ids) | TrainingJournal.session_id.in_(demo_session_ids)
        ))
        db.execute(delete(Notification).where(Notification.user_id.in_(demo_user_ids)))
        db.execute(delete(Performance).where(
            Performance.user_id.in_(demo_user_ids) | Performance.session_id.in_(demo_session_ids)
        ))
        db.execute(delete(Goal).where(Goal.user_id.in_(demo_user_ids)))
        db.execute(delete(PersonalRecord).where(PersonalRecord.user_id.in_(demo_user_ids)))
        db.execute(delete(WorkoutProgram).where(WorkoutProgram.user_id.in_(demo_user_ids)))
        db.execute(delete(Participation).where(
            Participation.user_id.in_(demo_user_ids) | Participation.session_id.in_(demo_session_ids)
        ))
        db.execute(delete(Exercise).where(Exercise.session_id.in_(demo_session_ids)))
        db.execute(delete(SportSession).where(SportSession.id.in_(demo_session_ids)))
        db.execute(delete(RefreshToken).where(RefreshToken.user_id.in_(demo_user_ids)))
        db.execute(delete(User).where(User.id.in_(demo_user_ids)))
        db.commit()

    print(f"Données de démonstration supprimées ({len(demo_user_ids)} compte(s) @sportplan.dev et leurs données).")


if __name__ == "__main__":
    run_reset()
