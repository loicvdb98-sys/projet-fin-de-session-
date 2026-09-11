from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
from .models import Exercise, Participation, Performance, Session, User  # noqa: F401
from .routers import auth, exercises, participations, performances, sessions, statistics, users


@asynccontextmanager
async def lifespan(_: FastAPI):
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


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
