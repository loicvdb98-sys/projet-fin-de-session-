"""Routeur FastAPI exposant les endpoints CRUD pour les séances d'entraînement, leur
duplication et leur export vers un agenda (fichier .ics)."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models.exercise import Exercise
from ..models.notification import Notification
from ..models.participation import Participation
from ..models.session import Session as SportSession
from ..models.user import User
from ..schemas.session import SessionCreate, SessionDuplicate, SessionRead, SessionRepeat, SessionUpdate
from ..services.ics import build_calendar
from ..services.time import is_past

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _notify_participants(db: Session, session: SportSession, title: str, message: str, kind: str = "info") -> None:
    """Crée une notification pour chaque inscrit à la séance (annulation ou modification).
    Ajoutée à la session SQLAlchemy sans commit : l'appelant commit avec le reste de son opération.
    """
    for participation in session.participations:
        db.add(Notification(user_id=participation.user_id, title=title, message=message, kind=kind))


@router.get("/", response_model=list[SessionRead])
def list_sessions(db: Session = Depends(get_db)):
    """Liste toutes les séances, triées par date de début (GET /sessions/). Accessible sans authentification."""
    # Charge coach (coach_name) et participations (registered_count) en une seule requête chacune,
    # au lieu d'une requête par séance.
    return db.scalars(
        select(SportSession)
        .options(joinedload(SportSession.coach), selectinload(SportSession.participations))
        .order_by(SportSession.starts_at)
    ).unique().all()


def _calendar_response(content: str, filename: str) -> Response:
    """Réponse de téléchargement d'un fichier agenda (.ics)."""
    return Response(content, media_type="text/calendar; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/calendar.ics", response_class=Response)
def my_calendar(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Exporte les séances à venir de l'utilisateur connecté au format agenda
    (GET /sessions/calendar.ics) : celles où il est inscrit (hors absences) et, pour un
    coach, celles qu'il anime."""
    registered = select(Participation.session_id).where(Participation.user_id == user.id, Participation.status != "absent")
    sessions = db.scalars(
        select(SportSession)
        .options(joinedload(SportSession.coach))
        .where(SportSession.starts_at > datetime.now(timezone.utc), or_(SportSession.id.in_(registered), SportSession.coach_id == user.id))
        .order_by(SportSession.starts_at)
    ).all()
    return _calendar_response(build_calendar(sessions, "Mes séances SportPlan"), "sportplan-mes-seances.ics")


@router.post("/", response_model=SessionRead, status_code=201)
def create_session(data: SessionCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("coach", "admin"))):
    """Crée une nouvelle séance (POST /sessions/). Réservé aux comptes coach et admin ;
    un coach ne peut se déclarer lui-même que comme animateur. La date de début doit être future.
    """
    if user.role == "coach" and data.coach_id != user.id:
        raise HTTPException(403, "Un coach ne peut créer que ses propres séances")
    if is_past(data.starts_at):
        raise HTTPException(400, "Une séance doit être planifiée dans le futur")
    if not db.get(User, data.coach_id):
        raise HTTPException(404, "Coach introuvable")
    item = SportSession(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{session_id}", response_model=SessionRead)
def get_session(session_id: int, db: Session = Depends(get_db)):
    """Récupère le détail d'une séance par son id (GET /sessions/{session_id})."""
    item = db.scalar(
        select(SportSession)
        .options(joinedload(SportSession.coach), selectinload(SportSession.participations))
        .where(SportSession.id == session_id)
    )
    if not item:
        raise HTTPException(404, "Séance introuvable")
    return item


@router.get("/{session_id}/calendar.ics", response_class=Response)
def session_calendar(session_id: int, db: Session = Depends(get_db)):
    """Exporte une séance au format agenda (GET /sessions/{session_id}/calendar.ics), avec
    un rappel une heure avant. Comme le détail d'une séance, accessible sans authentification."""
    item = db.scalar(select(SportSession).options(joinedload(SportSession.coach)).where(SportSession.id == session_id))
    if not item:
        raise HTTPException(404, "Séance introuvable")
    return _calendar_response(build_calendar([item], item.title), f"sportplan-seance-{item.id}.ics")


def _managed_session(session_id: int, db: Session, user: User) -> SportSession:
    """Charge une séance (avec ses exercices) que l'utilisateur a le droit de gérer :
    404 si elle n'existe pas, 403 si un coach n'en est pas l'animateur."""
    item = db.scalar(select(SportSession).options(selectinload(SportSession.exercises)).where(SportSession.id == session_id))
    if not item:
        raise HTTPException(404, "Séance introuvable")
    if user.role == "coach" and item.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    return item


def _as_utc(value: datetime) -> datetime:
    """Date avec fuseau : une valeur lue sans fuseau (SQL Server) est en UTC."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _next_weekly_start(starts_at: datetime) -> datetime:
    """Même jour de la semaine et même heure, à la première semaine à venir (au moins une semaine après)."""
    weeks = max(1, (datetime.now(timezone.utc) - starts_at) // timedelta(weeks=1) + 1)
    return starts_at + timedelta(weeks=weeks)


def _copy_session(item: SportSession, starts_at: datetime) -> SportSession:
    """Nouvelle séance identique (titre, description, durée, places, exercices), sans les inscrits."""
    return SportSession(
        title=item.title,
        description=item.description,
        starts_at=starts_at,
        duration_minutes=item.duration_minutes,
        capacity=item.capacity,
        coach_id=item.coach_id,
        exercises=[
            Exercise(name=exercise.name, description=exercise.description, sets=exercise.sets, repetitions=exercise.repetitions, rest_seconds=exercise.rest_seconds)
            for exercise in item.exercises
        ],
    )


@router.post("/{session_id}/duplicate", response_model=SessionRead, status_code=201)
def duplicate_session(
    session_id: int,
    data: SessionDuplicate | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("coach", "admin")),
):
    """Duplique une séance et ses exercices (POST /sessions/{session_id}/duplicate), sans
    les inscrits. Réservé au coach responsable ou à un admin. Par défaut, la copie a lieu
    le même jour de la semaine, à la même heure, la première semaine à venir.
    """
    item = _managed_session(session_id, db, user)
    starts_at = _as_utc(item.starts_at)
    if data and data.days:
        new_start = starts_at + timedelta(days=data.days)
        if is_past(new_start):
            raise HTTPException(400, "Une séance doit être planifiée dans le futur")
    else:
        new_start = _next_weekly_start(starts_at)
    copy = _copy_session(item, new_start)
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy


@router.post("/{session_id}/repeat", response_model=list[SessionRead], status_code=201)
def repeat_session(
    session_id: int,
    data: SessionRepeat,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("coach", "admin")),
):
    """Planifie une séance chaque semaine pendant `weeks` semaines (POST /sessions/{session_id}/repeat),
    au même jour et à la même heure, à partir de la première semaine à venir. Chaque copie reprend
    les exercices, sans les inscrits. Réservé au coach responsable ou à un admin.
    """
    item = _managed_session(session_id, db, user)
    first = _next_weekly_start(_as_utc(item.starts_at))
    copies = [_copy_session(item, first + timedelta(weeks=week)) for week in range(data.weeks)]
    db.add_all(copies)
    db.commit()
    for copy in copies:
        db.refresh(copy)
    return copies


@router.patch("/{session_id}", response_model=SessionRead)
def update_session(session_id: int, data: SessionUpdate, db: Session = Depends(get_db), user: User = Depends(require_roles("coach", "admin"))):
    """Met à jour une séance (PATCH /sessions/{session_id}). Réservé au coach responsable
    ou à un admin. Impossible de modifier une séance déjà passée, ni de la reprogrammer dans le passé.
    """
    item = db.get(SportSession, session_id)
    if not item:
        raise HTTPException(404, "Séance introuvable")
    if user.role == "coach" and item.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    if is_past(item.starts_at):
        raise HTTPException(409, "Une séance passée ne peut plus être modifiée")
    if data.starts_at and is_past(data.starts_at):
        raise HTTPException(400, "Une séance doit être planifiée dans le futur")
    changes = data.model_dump(exclude_unset=True)
    schedule_changed = "starts_at" in changes and changes["starts_at"] != item.starts_at
    for key, value in changes.items():
        setattr(item, key, value)
    if changes:
        message = (
            f"Nouvel horaire : {item.starts_at:%d/%m/%Y à %H:%M}."
            if schedule_changed
            else "Les informations de la séance ont été mises à jour."
        )
        _notify_participants(db, item, f"Séance modifiée : {item.title}", message, kind="warning" if schedule_changed else "info")
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("coach", "admin"))):
    """Supprime une séance (DELETE /sessions/{session_id}). Réservé au coach responsable
    ou à un admin. Impossible de supprimer une séance déjà passée. Prévient chaque inscrit
    par notification.
    """
    item = db.get(SportSession, session_id)
    if not item:
        raise HTTPException(404, "Séance introuvable")
    if user.role == "coach" and item.coach_id != user.id:
        raise HTTPException(403, "Vous ne gérez pas cette séance")
    if is_past(item.starts_at):
        raise HTTPException(409, "Une séance passée ne peut pas être supprimée")
    _notify_participants(
        db, item, f"Séance annulée : {item.title}",
        f"La séance prévue le {item.starts_at:%d/%m/%Y à %H:%M} a été annulée.", kind="warning"
    )
    db.delete(item)
    db.commit()
