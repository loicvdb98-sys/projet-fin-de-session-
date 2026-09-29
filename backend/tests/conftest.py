import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only-0123456789")

# Les imports de l'application viennent après la configuration de l'environnement
# ci-dessus : les réglages (base, clé JWT) sont lus au premier import.
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import rate_limit  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.security import hash_password  # noqa: E402

TEST_PASSWORD = "SportPlanTest2026"


@pytest.fixture
def db_factory():
    """Base SQLite en mémoire, recréée pour chaque test : les tests d'API ne touchent
    jamais la vraie base SQL Server."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    yield sessionmaker(bind=engine, autocommit=False, autoflush=False)
    engine.dispose()


@pytest.fixture
def client(db_factory):
    """Client HTTP de test branché sur la base en mémoire (sans lancer le cycle de vie
    de l'application, qui créerait les tables dans la base configurée)."""
    def override_get_db():
        db = db_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    rate_limit._attempts.clear()
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db_factory):
    """Crée directement en base un compte actif du rôle demandé et le renvoie."""
    def _make_user(email: str, role: str = "sportif", full_name: str = "Compte Test") -> User:
        with db_factory() as db:
            user = User(email=email, full_name=full_name, hashed_password=hash_password(TEST_PASSWORD), role=role, is_active=True)
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
    return _make_user


@pytest.fixture
def auth_headers(client):
    """En-têtes Authorization d'un compte existant, obtenus via POST /auth/login."""
    def _auth_headers(email: str) -> dict[str, str]:
        response = client.post("/auth/login", data={"username": email, "password": TEST_PASSWORD})
        assert response.status_code == 200, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    return _auth_headers
