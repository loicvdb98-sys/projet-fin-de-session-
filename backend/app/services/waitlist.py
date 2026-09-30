"""Liste d'attente : inscription automatique des sportifs en attente quand une place se libère
(désinscription, places ajoutées par le coach)."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.notification import Notification
from ..models.participation import Participation
from ..models.session import Session as SportSession
from ..models.user import User
from .time import is_past, local_datetime_label


def fill_from_waitlist(db: Session, session: SportSession) -> list[int]:
    """Inscrit les sportifs en attente, dans leur ordre d'arrivée, tant qu'il reste des places
    sur la séance (à venir uniquement), et prévient chacun par une notification. Un compte
    désactivé ou déjà inscrit est retiré de la file sans être inscrit. Sans commit : l'appelant
    valide avec le reste de son opération. Retourne les ids des sportifs inscrits.
    """
    if is_past(session.starts_at) or not session.waitlist:
        return []
    db.flush()  # une désinscription en cours doit déjà être décomptée
    registered = db.scalar(select(func.count(Participation.id)).where(Participation.session_id == session.id)) or 0
    promoted: list[int] = []
    for entry in list(session.waitlist):
        if registered >= session.capacity:
            break
        session.waitlist.remove(entry)  # supprimée en base (delete-orphan)
        user = db.get(User, entry.user_id)
        already_registered = db.scalar(select(Participation.id).where(Participation.user_id == entry.user_id, Participation.session_id == session.id))
        if not user or not user.is_active or already_registered:
            continue
        db.add(Participation(user_id=entry.user_id, session_id=session.id))
        db.add(Notification(
            user_id=entry.user_id,
            title=f"Place obtenue : {session.title}"[:120],
            message=f"Une place s'est libérée : vous êtes inscrit à la séance du {local_datetime_label(session.starts_at)}.",
            kind="success",
        ))
        registered += 1
        promoted.append(entry.user_id)
    return promoted
