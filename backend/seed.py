"""Insert a small, repeatable dataset for local development and manual testing."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Exercise, Participation, Performance, Session as SportSession, User
from app.security import hash_password

DEMO_PASSWORD = "SportPlanDemo2026!"


def get_or_create_user(db, email: str, full_name: str, role: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(DEMO_PASSWORD),
            role=role,
            is_active=True,
        )
        db.add(user)
        db.flush()
    return user


def get_or_create_session(db, title: str, starts_at: datetime, coach_id: int, description: str) -> SportSession:
    session = db.scalar(select(SportSession).where(SportSession.title == title))
    if session is None:
        session = SportSession(
            title=title,
            starts_at=starts_at,
            duration_minutes=60,
            capacity=16,
            coach_id=coach_id,
            description=description,
        )
        db.add(session)
        db.flush()
    return session


def add_participation(db, user_id: int, session_id: int, status: str) -> Participation:
    participation = db.scalar(
        select(Participation).where(
            Participation.user_id == user_id,
            Participation.session_id == session_id,
        )
    )
    if participation is None:
        participation = Participation(user_id=user_id, session_id=session_id, status=status)
        db.add(participation)
        db.flush()
    return participation


def add_exercise(db, session_id: int, name: str, sets: int, repetitions: int) -> Exercise:
    exercise = db.scalar(
        select(Exercise).where(Exercise.session_id == session_id, Exercise.name == name)
    )
    if exercise is None:
        exercise = Exercise(
            session_id=session_id,
            name=name,
            description="Exercice de démonstration",
            sets=sets,
            repetitions=repetitions,
        )
        db.add(exercise)
        db.flush()
    return exercise


def run_seed() -> None:
    Base.metadata.create_all(bind=engine)
    now = datetime.now(timezone.utc).replace(microsecond=0)

    with SessionLocal() as db:
        coach = get_or_create_user(db, "coach.demo@sportplan.local", "Camille Coach", "coach")
        sportif = get_or_create_user(db, "sportif.demo@sportplan.local", "Alex Sportif", "sportif")
        get_or_create_user(db, "admin.demo@sportplan.local", "Admin SportPlan", "admin")

        strength = get_or_create_session(
            db,
            "Renforcement full body",
            now + timedelta(days=2, hours=2),
            coach.id,
            "Une séance complète pour travailler la force et la mobilité.",
        )
        cardio = get_or_create_session(
            db,
            "Cardio & endurance",
            now + timedelta(days=5, hours=1),
            coach.id,
            "Circuit cardio accessible à tous les niveaux.",
        )
        mobility = get_or_create_session(
            db,
            "Mobilité du dimanche",
            now + timedelta(days=8),
            coach.id,
            "Étirements actifs et mobilité articulaire.",
        )

        squat = add_exercise(db, strength.id, "Squat", 4, 10)
        add_exercise(db, strength.id, "Développé couché", 3, 8)
        add_exercise(db, cardio.id, "Course fractionnée", 6, 1)
        add_exercise(db, mobility.id, "Flow mobilité", 3, 5)

        attended = add_participation(db, sportif.id, strength.id, "present")
        add_participation(db, sportif.id, cardio.id, "inscrit")
        add_participation(db, sportif.id, mobility.id, "inscrit")

        existing_performance = db.scalar(
            select(Performance).where(
                Performance.user_id == sportif.id,
                Performance.session_id == strength.id,
            )
        )
        if existing_performance is None:
            db.add(Performance(
                user_id=sportif.id,
                session_id=strength.id,
                score=85,
                notes="Bonne technique et progression régulière.",
            ))

        db.commit()

    print("Données de démonstration installées.")
    print("Coach   : coach.demo@sportplan.local / " + DEMO_PASSWORD)
    print("Sportif : sportif.demo@sportplan.local / " + DEMO_PASSWORD)
    print("Admin   : admin.demo@sportplan.local / " + DEMO_PASSWORD)


if __name__ == "__main__":
    run_seed()
