# SportPlan — Backend

API REST FastAPI pour l'application SportPlan. Voir
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) pour le détail de
l'organisation du code.

## Démarrage local

Voir [SETUP_LOCAL.md](SETUP_LOCAL.md) (configuration de SQL Server et de
l'API) et [SEED.md](SEED.md) (comptes et données de démonstration).

```powershell
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Vérification de santé : `GET http://127.0.0.1:8000/health`.
Documentation interactive générée par FastAPI : `http://127.0.0.1:8000/docs`.

## Tests

```powershell
py -m pip install -r requirements-dev.txt
py -m pytest
```

## Structure

```text
app/
├── main.py         point d'entrée : création de l'app, en-têtes de sécurité, CORS, routeurs
├── config.py       variables d'environnement (Pydantic Settings)
├── database.py     connexion SQLAlchemy et sessions
├── dependencies.py dépendances FastAPI réutilisables
├── security.py     hachage des mots de passe (Argon2), JWT (PyJWT)
├── rate_limit.py   limitation des tentatives (par IP, par compte, par utilisateur)
├── models/         modèles SQLAlchemy
├── schemas/        schémas Pydantic (validation des requêtes/réponses)
├── routers/        endpoints REST par domaine métier
└── services/       logique métier réutilisable
```

## Configuration

Copier `.env.example` en `.env` et renseigner les valeurs (voir
[SETUP_LOCAL.md](SETUP_LOCAL.md)) :

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Chaîne de connexion SQLAlchemy/pyodbc vers SQL Server |
| `SECRET_KEY` | Clé de signature des JWT (32 caractères minimum) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de vie du token d'accès |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Durée de vie du refresh token |
| `ALLOWED_ORIGINS` | Origines autorisées par le middleware CORS |
| `ALLOWED_ORIGIN_REGEX` | Origines supplémentaires (expression régulière), ex. le réseau local pour un téléphone |
| `EXPOSE_API_DOCS` | `true` par défaut ; `false` en production masque `/docs`, `/redoc` et `/openapi.json` |

Les protections de l'API (jetons, limitation des tentatives, en-têtes HTTP) sont
décrites dans [docs/SECURITE.md](../docs/SECURITE.md).
