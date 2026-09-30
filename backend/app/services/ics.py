"""Génération de fichiers agenda au format iCalendar (RFC 5545), importables dans Google
Agenda, Outlook, Apple Calendrier ou Samsung Calendar : une séance devient un événement,
avec un rappel une heure avant.
"""

from collections.abc import Iterable
from datetime import datetime, timedelta, timezone

from ..models.session import Session as SportSession

PRODUCT_ID = "-//SportPlan//Seances sportives//FR"
REMINDER_BEFORE = timedelta(hours=1)


def _utc(value: datetime) -> str:
    """Date au format iCalendar UTC (20261001T173000Z) ; une date sans fuseau est en UTC."""
    normalized = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return normalized.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _escape(text: str) -> str:
    """Échappe les caractères réservés d'une valeur texte (antislash, virgule, point-virgule, sauts de ligne)."""
    return (
        text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
        .replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", "\\n")
    )


def _fold(line: str) -> str:
    """Coupe une ligne à 75 octets, les suivantes commençant par une espace (règle du format)."""
    encoded = line.encode("utf-8")
    if len(encoded) <= 75:
        return line
    parts, current = [], b""
    for character in line:
        piece = character.encode("utf-8")
        if len(current) + len(piece) > (75 if not parts else 74):
            parts.append(current.decode("utf-8"))
            current = b""
        current += piece
    parts.append(current.decode("utf-8"))
    return "\r\n ".join(parts)


def _event(session: SportSession, stamp: str) -> list[str]:
    ends_at = session.starts_at + timedelta(minutes=session.duration_minutes)
    description = f"Coach : {session.coach_name}"
    if session.description:
        description += f"\n{session.description}"
    return [
        "BEGIN:VEVENT",
        f"UID:sportplan-seance-{session.id}@sportplan",
        f"DTSTAMP:{stamp}",
        f"DTSTART:{_utc(session.starts_at)}",
        f"DTEND:{_utc(ends_at)}",
        f"SUMMARY:{_escape(session.title)}",
        f"DESCRIPTION:{_escape(description)}",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        f"DESCRIPTION:{_escape(session.title)}",
        f"TRIGGER:-PT{int(REMINDER_BEFORE.total_seconds() // 60)}M",
        "END:VALARM",
        "END:VEVENT",
    ]


def build_calendar(sessions: Iterable[SportSession], name: str) -> str:
    """Construit un calendrier contenant un événement par séance (lignes terminées par CRLF)."""
    stamp = _utc(datetime.now(timezone.utc))
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", f"PRODID:{PRODUCT_ID}", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", f"X-WR-CALNAME:{_escape(name)}"]
    for session in sessions:
        lines.extend(_event(session, stamp))
    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(line) for line in lines) + "\r\n"
