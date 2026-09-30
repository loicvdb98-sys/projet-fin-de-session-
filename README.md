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
| Sécurité | JWT (access + refresh token avec rotation), Argon2, limitation des tentatives, CORS (voir [docs/SECURITE.md](docs/SECURITE.md)) |
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

### 4. Tester sur un téléphone (même Wi-Fi)

1. Le PC et le téléphone doivent être sur le même réseau Wi-Fi, déclaré comme
   réseau **privé** dans Windows (les ports 4200 et 8000 doivent y être autorisés
   par le pare-feu).
2. Dans `backend/.env`, autoriser le front servi sur le réseau local :
   `ALLOWED_ORIGIN_REGEX=http://192\.168\.\d{1,3}\.\d{1,3}:4200`
3. Lancer l'API et le front en écoutant sur le réseau :

   ```powershell
   cd backend
   py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

   cd frontend
   npm run start:lan
   ```

4. Sur le téléphone, ouvrir `http://<adresse IP du PC>:4200` (affichée par
   `npm run start:lan` sur la ligne « Network », ou par `ipconfig`). L'application
   appelle l'API à la même adresse, sur le port 8000.

## Tests

```powershell
# Backend (tests unitaires et tests d'API sur une base SQLite en mémoire)
cd backend
py -m pip install -r requirements-dev.txt
py -m pytest

# Frontend
cd frontend
npm test
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — organisation du code backend et frontend.
- [docs/ROLES.md](docs/ROLES.md) — ce que peuvent voir et faire un sportif, un coach et un admin.
- [docs/SECURITE.md](docs/SECURITE.md) — protections des comptes, des jetons et de l'API.
- [backend/SETUP_LOCAL.md](backend/SETUP_LOCAL.md) — configuration de la base de données et de l'API en local.
- [backend/SEED.md](backend/SEED.md) — comptes et données de démonstration.
- [frontend/README.md](frontend/README.md) — structure et commandes du frontend Angular.
- [PRESENTATION_JURY.md](PRESENTATION_JURY.md) — support de présentation orale du projet.
