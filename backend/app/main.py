"""Point d'entrée de l'application FastAPI : création de l'app, en-têtes de sécurité,
configuration du CORS, enregistrement des routeurs et création automatique des tables
au démarrage.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .config import get_settings
from .database import Base, SessionLocal, engine, ensure_indexes
# Les modèles sont importés ici (même sans usage direct) pour que SQLAlchemy
# les enregistre dans Base.metadata avant l'appel à create_all().
from .models import AuditEvent, Exercise, Goal, Notification, Participation, PasswordResetToken, Performance, PersonalRecord, Session, TrainingJournal, User, WaitlistEntry, WorkoutProgram  # noqa: F401
from .routers import admin, auth, exercises, goals, journal, notifications, participations, performances, programs, sessions, statistics, users, waitlist
from .routers.auth import purge_expired_refresh_tokens, purge_expired_reset_tokens
from .services.audit import purge_old_events

# Messages de l'application (connexions, sécurité, maintenance) affichés dans la console avec
# l'heure et le niveau ; sans cela, seuls les avertissements apparaissaient.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s : %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Cycle de vie de l'application : au démarrage, crée les tables et les index manquants
    en base, puis supprime les refresh tokens et liens de réinitialisation expirés (inutiles,
    ils s'accumulent sinon)."""
    Base.metadata.create_all(bind=engine)
    ensure_indexes(engine)
    with SessionLocal() as db:
        purge_expired_refresh_tokens(db)
        purge_expired_reset_tokens(db)
        purge_old_events(db)
        db.commit()
    yield


settings = get_settings()
docs_enabled = settings.expose_api_docs
app = FastAPI(
    title="Sports Sessions API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)
# Réponses de plus de 1 Ko compressées (listes de séances, participations...) : moins de
# données à télécharger, surtout sur téléphone.
app.add_middleware(GZipMiddleware, minimum_size=1000)
# Le jeton voyage dans l'en-tête Authorization, jamais dans un cookie : pas besoin
# d'allow_credentials, et seuls les méthodes et en-têtes utilisés par le front sont permis.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=settings.allowed_origin_regex,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# En-têtes ajoutés à chaque réponse de l'API. La politique de contenu stricte n'est pas
# appliquée aux pages de documentation, qui chargent l'interface Swagger depuis un CDN.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}
DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Ajoute les en-têtes de sécurité ; les réponses d'authentification (jetons) ne
    doivent jamais être mises en cache par le navigateur ou un proxy."""
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)
    if not request.url.path.startswith(DOCS_PATHS):
        response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    if request.url.path.startswith("/auth"):
        response.headers["Cache-Control"] = "no-store"
    return response

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(sessions.router)
app.include_router(waitlist.router)
app.include_router(exercises.router)
app.include_router(participations.router)
app.include_router(performances.router)
app.include_router(statistics.router)
app.include_router(goals.router)
app.include_router(programs.router)
app.include_router(notifications.router)
app.include_router(journal.router)
app.include_router(admin.router)


@app.get("/health", tags=["health"])
def health():
    """Point de contrôle de santé (GET /health) : confirme que l'API répond."""
    return {"status": "ok"}
