# SportPlan — Gestion de séances sportives

Application web de gestion et de suivi de séances sportives : planification des
entraînements, suivi des performances, objectifs, programmes, journal
d'entraînement et notifications. Projet de fin de session.

## Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | Angular 22, TypeScript, Angular Material, Chart.js |
| Backend | Python 3, FastAPI, SQLAlchemy, Pydantic |
| Base de données | SQL Server (via `pyodbc`) |
| Sécurité | JWT (access + refresh token), Argon2 pour le hachage des mots de passe, CORS |
| Tests | Pytest (backend), Vitest (frontend) |

## Structure du dépôt

```text
projet-fin-session/
├── backend/    API FastAPI (voir backend/SETUP_LOCAL.md pour le démarrage local)
├── frontend/   Application Angular (voir frontend/README.md)
└── docs/       Documentation d'architecture
```

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour le détail de l'organisation
du code de chaque couche.

## Démarrage rapide

### 1. Base de données

Démarrer l'instance SQL Server locale et créer la base `GestionSeancesSport`
(voir [backend/SETUP_LOCAL.md](backend/SETUP_LOCAL.md) pour les détails propres
à une instance nommée type `MSI\DATAVIZ`).

### 2. Backend

```powershell
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

L'API est servie sur `http://127.0.0.1:8000`, avec une vérification de santé sur
`/health`. Jeu de données de démonstration : voir [backend/SEED.md](backend/SEED.md).

### 3. Frontend

```powershell
cd frontend
npm install
npm start
```

L'application est servie sur `http://localhost:4200`.

## Tests

```powershell
# Backend
cd backend
py -m pytest

# Frontend
cd frontend
npm test
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — organisation du code backend et frontend.
- [backend/SETUP_LOCAL.md](backend/SETUP_LOCAL.md) — configuration de la base de données et de l'API en local.
- [backend/SEED.md](backend/SEED.md) — comptes et données de démonstration.
- [frontend/README.md](frontend/README.md) — structure et commandes du frontend Angular.
- [PRESENTATION_JURY.md](PRESENTATION_JURY.md) — support de présentation orale du projet.
