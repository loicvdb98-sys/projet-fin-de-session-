"""Point d'entrée de l'application FastAPI : création de l'app, configuration du CORS,
enregistrement des routeurs et création automatique des tables au démarrage.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
# Les modèles sont importés ici (même sans usage direct) pour que SQLAlchemy
# les enregistre dans Base.metadata avant l'appel à create_all().
from .models import Exercise, Goal, Notification, Participation, Performance, PersonalRecord, Session, TrainingJournal, User, WorkoutProgram  # noqa: F401
from .routers import auth, exercises, goals, journal, notifications, participations, performances, programs, sessions, statistics, users


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Cycle de vie de l'application : crée les tables manquantes en base au démarrage."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Sports Sessions API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(sessions.router)
app.include_router(exercises.router)
app.include_router(participations.router)
app.include_router(performances.router)
app.include_router(statistics.router)
app.include_router(goals.router)
app.include_router(programs.router)
app.include_router(notifications.router)
app.include_router(journal.router)


@app.get("/health", tags=["health"])
def health():
    """Point de contrôle de santé (GET /health) : confirme que l'API répond."""
    return {"status": "ok"}
