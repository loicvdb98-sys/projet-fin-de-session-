"""Envoi des emails de l'application (lien de réinitialisation du mot de passe).

Sans serveur SMTP configuré (SMTP_HOST vide, le cas par défaut), le message est écrit dans le
journal de l'API : pratique en développement et en démonstration. Avec SMTP_HOST (et
éventuellement SMTP_USER / SMTP_PASSWORD), il est envoyé en SMTP chiffré (STARTTLS).
"""

import logging
import smtplib
from email.message import EmailMessage

from ..config import get_settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    """Envoie un email texte ; une erreur d'envoi est journalisée sans être propagée (l'appelant
    répond de la même façon que l'email parte ou non, pour ne rien révéler)."""
    settings = get_settings()
    if not settings.smtp_host:
        logger.warning("Email non envoyé (SMTP non configuré) — destinataire : %s — objet : %s\n%s", to, subject, body)
        return
    message = EmailMessage()
    message["From"] = settings.smtp_sender
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password or "")
            smtp.send_message(message)
    except (smtplib.SMTPException, OSError) as error:
        logger.error("Échec de l'envoi de l'email à %s : %s", to, error)
