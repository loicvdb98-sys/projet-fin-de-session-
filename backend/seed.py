"""Insert a rich, repeatable demo dataset for local development, manual testing and
live presentations. Idempotent: safe to re-run, it will not duplicate existing rows.

All demo accounts use the @sportplan.dev email domain, which is also what
reset_demo.py relies on to remove exactly what this script adds (and nothing
else) — see SEED.md.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import (
    Exercise,
    Goal,
    Notification,
    Participation,
    PersonalRecord,
    Performance,
    Session as SportSession,
    TrainingJournal,
    User,
    WorkoutProgram,
)
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


def get_or_create_session(db, title: str, starts_at: datetime, coach_id: int, description: str, capacity: int = 16) -> SportSession:
    session = db.scalar(select(SportSession).where(SportSession.title == title))
    if session is None:
        session = SportSession(
            title=title,
            starts_at=starts_at,
            duration_minutes=60,
            capacity=capacity,
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
    else:
        participation.status = status
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


def add_performance(db, user_id: int, session_id: int, score: float, notes: str, recorded_at: datetime) -> None:
    existing = db.scalar(
        select(Performance).where(Performance.user_id == user_id, Performance.session_id == session_id)
    )
    if existing is None:
        db.add(Performance(user_id=user_id, session_id=session_id, score=score, notes=notes, recorded_at=recorded_at))


def get_or_create_goal(db, user_id: int, title: str, **fields) -> None:
    if db.scalar(select(Goal).where(Goal.user_id == user_id, Goal.title == title)) is None:
        db.add(Goal(user_id=user_id, title=title, **fields))


def get_or_create_record(db, user_id: int, exercise_name: str, **fields) -> None:
    if db.scalar(select(PersonalRecord).where(PersonalRecord.user_id == user_id, PersonalRecord.exercise_name == exercise_name)) is None:
        db.add(PersonalRecord(user_id=user_id, exercise_name=exercise_name, **fields))


def get_or_create_program(db, user_id: int, name: str, **fields) -> None:
    if db.scalar(select(WorkoutProgram).where(WorkoutProgram.user_id == user_id, WorkoutProgram.name == name)) is None:
        db.add(WorkoutProgram(user_id=user_id, name=name, **fields))


def get_or_create_journal_entry(db, user_id: int, session_id: int, **fields) -> None:
    if db.scalar(select(TrainingJournal).where(TrainingJournal.user_id == user_id, TrainingJournal.session_id == session_id)) is None:
        db.add(TrainingJournal(user_id=user_id, session_id=session_id, **fields))


def get_or_create_notification(db, user_id: int, title: str, **fields) -> None:
    if db.scalar(select(Notification).where(Notification.user_id == user_id, Notification.title == title)) is None:
        db.add(Notification(user_id=user_id, title=title, **fields))


def run_seed() -> None:
    Base.metadata.create_all(bind=engine)
    now = datetime.now(timezone.utc).replace(microsecond=0)

    with SessionLocal() as db:
        coach = get_or_create_user(db, "coach.demo@sportplan.dev", "Camille Coach", "coach")
        sportif = get_or_create_user(db, "sportif.demo@sportplan.dev", "Alex Sportif", "sportif")
        admin = get_or_create_user(db, "admin.demo@sportplan.dev", "Admin SportPlan", "admin")
        lea = get_or_create_user(db, "lea.martin@sportplan.dev", "Léa Martin", "sportif")
        thomas = get_or_create_user(db, "thomas.dupont@sportplan.dev", "Thomas Dupont", "sportif")
        ines = get_or_create_user(db, "ines.bernard@sportplan.dev", "Inès Bernard", "sportif")
        db.flush()

        # --- Séances passées (historique de présence et de performance) ---
        s1 = get_or_create_session(db, "Full body débutant", now - timedelta(days=16), coach.id,
                                    "Prise en main en douceur pour découvrir les mouvements de base.")
        s2 = get_or_create_session(db, "HIIT express", now - timedelta(days=13), coach.id,
                                    "Circuit intense de 30 minutes, idéal en semaine chargée.")
        s3 = get_or_create_session(db, "Renforcement full body", now - timedelta(days=9), coach.id,
                                    "Une séance complète pour travailler la force et la mobilité.")
        s4 = get_or_create_session(db, "Cardio & endurance", now - timedelta(days=6), coach.id,
                                    "Circuit cardio accessible à tous les niveaux.")
        s5 = get_or_create_session(db, "Mobilité du dimanche", now - timedelta(days=3), coach.id,
                                    "Étirements actifs et mobilité articulaire.")

        # --- Séances à venir (inscription, calendrier) ---
        s6 = get_or_create_session(db, "Circuit force", now + timedelta(days=2, hours=2), coach.id,
                                    "Circuit en ateliers : squat, tirage, gainage.", capacity=10)
        s7 = get_or_create_session(db, "Yoga & récupération", now + timedelta(days=5, hours=1), coach.id,
                                    "Séance douce pour récupérer entre deux blocs d'entraînement.", capacity=14)
        s8 = get_or_create_session(db, "Préparation trail", now + timedelta(days=9), coach.id,
                                    "Sortie longue à allure modérée, terrain vallonné.", capacity=12)
        db.flush()

        for session in (s1, s2, s3, s4, s5, s6, s7, s8):
            add_exercise(db, session.id, "Squat", 4, 10)
            add_exercise(db, session.id, "Gainage", 3, 1)
        for session in (s3, s6):
            add_exercise(db, session.id, "Développé couché", 3, 8)
        for session in (s2, s4, s8):
            add_exercise(db, session.id, "Course fractionnée", 6, 1)

        # --- Participations : statuts variés sur les séances passées, inscriptions sur les futures ---
        add_participation(db, sportif.id, s1.id, "present")
        add_participation(db, lea.id, s1.id, "present")
        add_participation(db, thomas.id, s1.id, "absent")

        add_participation(db, sportif.id, s2.id, "present")
        add_participation(db, lea.id, s2.id, "absent")
        add_participation(db, ines.id, s2.id, "present")

        add_participation(db, sportif.id, s3.id, "present")
        add_participation(db, lea.id, s3.id, "present")
        add_participation(db, thomas.id, s3.id, "present")

        add_participation(db, sportif.id, s4.id, "present")
        add_participation(db, ines.id, s4.id, "present")
        add_participation(db, thomas.id, s4.id, "absent")

        add_participation(db, sportif.id, s5.id, "present")
        add_participation(db, lea.id, s5.id, "present")

        add_participation(db, sportif.id, s6.id, "inscrit")
        add_participation(db, lea.id, s6.id, "inscrit")
        add_participation(db, thomas.id, s7.id, "inscrit")
        add_participation(db, ines.id, s8.id, "inscrit")

        # --- Performances : progression du sportif de démo dans le temps ---
        add_performance(db, sportif.id, s1.id, 68, "Reprise après une semaine de récupération.", s1.starts_at + timedelta(hours=1))
        add_performance(db, sportif.id, s2.id, 74, "Bonne endurance sur la séance cardio.", s2.starts_at + timedelta(hours=1))
        add_performance(db, sportif.id, s3.id, 81, "Objectif hebdomadaire atteint.", s3.starts_at + timedelta(hours=1))
        add_performance(db, sportif.id, s4.id, 88, "Nouveau record personnel.", s4.starts_at + timedelta(hours=1))
        add_performance(db, sportif.id, s5.id, 92, "Très bonne régularité.", s5.starts_at + timedelta(hours=1))
        add_performance(db, lea.id, s3.id, 79, "Bonne séance, technique en progrès.", s3.starts_at + timedelta(hours=1))
        add_performance(db, thomas.id, s3.id, 71, "Encore un peu de travail sur la posture.", s3.starts_at + timedelta(hours=1))

        # --- Objectifs et records personnels du sportif de démo ---
        get_or_create_goal(db, sportif.id, "Terminer 12 séances ce mois-ci", metric="séances",
                            target_value=12, current_value=9, unit="séances",
                            due_date=(now + timedelta(days=8)).date(), notes="Rester régulier chaque semaine.")
        get_or_create_goal(db, sportif.id, "Améliorer mon endurance", metric="score",
                            target_value=100, current_value=88, unit="points",
                            due_date=(now + timedelta(days=23)).date(), notes="Suivi avec les performances cardio.")
        get_or_create_record(db, sportif.id, "Développé couché", value=85, unit="kg",
                              achieved_at=now - timedelta(days=6), notes="Nouvelle meilleure charge.")
        get_or_create_record(db, sportif.id, "Course 5 km", value=24.8, unit="min",
                              achieved_at=now - timedelta(days=13), notes="Allure régulière.")
        get_or_create_record(db, sportif.id, "Squat", value=105, unit="kg",
                              achieved_at=now - timedelta(days=9), notes="Objectif dépassé.")

        # --- Programmes d'entraînement ---
        get_or_create_program(db, sportif.id, "Prise de masse — 8 semaines", weeks=8,
                               description="Progression linéaire sur les mouvements polyarticulaires.")
        get_or_create_program(db, sportif.id, "Préparation 10 km", weeks=6,
                               description="Alternance endurance fondamentale et fractionné.")

        # --- Journal d'entraînement ---
        get_or_create_journal_entry(db, sportif.id, s3.id, fatigue=4, mood="motivé",
                                     notes="Séance solide, bonnes sensations sur le squat.",
                                     coach_comment="Continue comme ça, la technique progresse bien.")
        get_or_create_journal_entry(db, sportif.id, s5.id, fatigue=2, mood="détendu",
                                     notes="Séance de récupération appréciée après la semaine chargée.")

        # --- Notifications ---
        get_or_create_notification(db, sportif.id, "Bienvenue sur SportPlan",
                                    message="Consultez vos prochaines séances et suivez votre progression depuis le tableau de bord.",
                                    kind="info")
        get_or_create_notification(db, sportif.id, "Nouvelle séance disponible",
                                    message="« Circuit force » vient d'être ajoutée par votre coach.", kind="info")
        get_or_create_notification(db, coach.id, "Bienvenue sur SportPlan",
                                    message="Créez votre première séance depuis « Vos séances » pour commencer.", kind="info")

        db.commit()

    print("Données de démonstration installées.")
    print("Coach   : coach.demo@sportplan.dev / " + DEMO_PASSWORD)
    print("Sportif : sportif.demo@sportplan.dev / " + DEMO_PASSWORD)
    print("Admin   : admin.demo@sportplan.dev / " + DEMO_PASSWORD)
    print("+ 3 sportifs supplémentaires (lea.martin / thomas.dupont / ines.bernard @sportplan.dev)")
    print("Pour tout retirer avant une utilisation réelle : py reset_demo.py")


if __name__ == "__main__":
    run_seed()
