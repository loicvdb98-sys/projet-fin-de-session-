# Architecture

## Vue d'ensemble

```text
Angular (frontend) ──HTTP/JSON (JWT)──▶ FastAPI (backend) ──SQLAlchemy──▶ SQL Server
```

Le frontend et le backend sont deux projets indépendants qui communiquent
uniquement via l'API REST exposée par FastAPI. Le frontend ne connaît jamais la
base de données directement.

## Backend (`backend/app/`)

Organisation par type de responsabilité, standard pour une API FastAPI :

```text
backend/app/
├── main.py          Point d'entrée : création de l'app FastAPI, CORS, montage des routeurs
├── config.py        Lecture des variables d'environnement (Pydantic Settings)
├── database.py       Connexion SQLAlchemy et fabrique de sessions
├── dependencies.py  Dépendances FastAPI réutilisables (ex: session DB, utilisateur courant)
├── security.py      Hachage des mots de passe (Argon2), création/validation des JWT
├── rate_limit.py     Limitation du nombre de requêtes
├── models/           Modèles SQLAlchemy (une classe = une table)
├── schemas/          Schémas Pydantic (validation des requêtes/réponses HTTP)
├── routers/           Endpoints REST regroupés par domaine métier
└── services/          Logique métier réutilisable, indépendante de FastAPI
```

Flux typique d'une requête : `router` reçoit la requête → valide l'entrée avec un
`schema` → délègue à un `service` ou manipule directement un `model` via la
session SQLAlchemy → renvoie un `schema` de réponse.

## Frontend (`frontend/src/app/`)

Organisation par fonctionnalité (feature-based), plutôt que par type de fichier :

```text
frontend/src/app/
├── core/         Bootstrap de l'application : app.component, app.config, routes, guard d'authentification
├── shared/        Code transverse réutilisé par plusieurs fonctionnalités
│   ├── components/  Composants UI génériques (toasts, bandeau démo)
│   ├── services/    Services transverses (toast, thème, statistiques)
│   └── data/        Données de démonstration (mode DEMO_MODE)
└── features/       Un dossier par domaine métier, page + service co-localisés
    ├── auth/            login, auth.service, auth.interceptor
    ├── dashboard/       tableau de bord
    ├── sessions/        séances d'entraînement
    ├── calendar/        calendrier
    ├── workout-create/  création de séance
    ├── participations/  participations aux séances
    ├── performances/    suivi des performances
    ├── goals/           objectifs et records personnels
    ├── programs/        programmes d'entraînement
    ├── notifications/   notifications
    ├── journal/         journal d'entraînement
    ├── athletes/        gestion des athlètes (côté coach)
    └── profile/         profil utilisateur
```

Chaque dossier de `features/` regroupe le composant de page et le service
Angular qui lui est propre (ex: `features/goals/goals.component.ts` et
`features/goals/goal.service.ts`). Quand un service est utilisé par plusieurs
fonctionnalités (ex: le tableau de bord agrège des données de plusieurs
domaines), il reste dans le dossier de la fonctionnalité qui en est
responsable et les autres l'importent via les alias TypeScript.

### Alias d'imports

Le `tsconfig.json` définit trois alias pour éviter les chaînes d'imports
relatifs (`../../../services/...`) :

| Alias | Cible |
| --- | --- |
| `@core/*` | `src/app/core/*` |
| `@shared/*` | `src/app/shared/*` |
| `@features/*` | `src/app/features/*` |

Un import au sein d'un même dossier de fonctionnalité reste relatif
(`./goal.service`) ; un import vers une autre fonctionnalité ou vers du code
transverse utilise l'alias correspondant.

## Authentification

1. L'utilisateur se connecte via `features/auth/login.component.ts`, qui appelle
   `AuthService`.
2. `AuthService` stocke le JWT (access + refresh token) reçu de l'endpoint
   `/auth` du backend.
3. `authInterceptor` (`features/auth/auth.interceptor.ts`) ajoute
   automatiquement le token à chaque requête HTTP sortante.
4. `authGuard` / `coachGuard` (`core/auth.guard.ts`) protègent les routes
   Angular définies dans `core/app.routes.ts` selon le rôle de l'utilisateur.
5. Côté backend, `security.py` valide le JWT et `dependencies.py` expose
   l'utilisateur courant aux routeurs qui en ont besoin.
