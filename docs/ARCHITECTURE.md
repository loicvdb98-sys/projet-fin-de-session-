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
├── main.py          Point d'entrée : création de l'app FastAPI, en-têtes de sécurité, CORS, montage des routeurs
├── config.py        Lecture des variables d'environnement (Pydantic Settings)
├── database.py       Connexion SQLAlchemy et fabrique de sessions
├── dependencies.py  Dépendances FastAPI réutilisables (ex: session DB, utilisateur courant)
├── security.py      Hachage des mots de passe (Argon2), création/validation des JWT (PyJWT)
├── rate_limit.py     Limitation des tentatives (par IP, par compte, par utilisateur)
├── models/           Modèles SQLAlchemy (une classe = une table)
├── schemas/          Schémas Pydantic (validation des requêtes/réponses HTTP)
├── routers/           Endpoints REST regroupés par domaine métier, avec leurs règles métier
└── services/          Utilitaires partagés indépendants de FastAPI (dates, agenda .ics, liste d'attente, emails, badges, journal d'activité)
```

Flux typique d'une requête : `router` reçoit la requête → l'entrée est validée par
un `schema` Pydantic → le routeur vérifie les droits (`require_roles`, propriétaire
de la ressource) et les règles métier (capacité, dates, statuts) → il lit ou écrit
les `models` via la session SQLAlchemy → il renvoie un `schema` de réponse.

### Performances de la base et de l'API

- **Index** sur toutes les clés étrangères (`user_id`, `session_id`, `coach_id`) et sur
  la date des séances, déclarés dans les modèles. `ensure_indexes` (`database.py`) les
  crée au démarrage s'ils manquent, même sur une base déjà remplie.
- **Liste d'attente** : table `waitlist_entries` (une demande par sportif et par séance,
  index unique `ux_waitlist_user_session`). `services/waitlist.py` (`fill_from_waitlist`)
  inscrit les premiers en attente quand une place se libère ; il est appelé par la
  désinscription (`DELETE /participations/{id}`) et par l'ajout de places
  (`PATCH /sessions/{id}`).
- **Unicité des inscriptions** : l'index unique `ux_participations_user_session` empêche
  deux inscriptions du même sportif à la même séance, même en cas de double clic simultané
  (l'API répond alors 409).
- **Requêtes groupées** : les listes chargent coach et inscrits en une requête chacune
  (`joinedload` / `selectinload`) plutôt qu'une par séance ; `/statistics/me` calcule
  ses six chiffres en trois requêtes (COUNT conditionnels).
- **Compression** : les réponses de plus de 1 Ko sont compressées (gzip).
- **Purge** : les refresh tokens expirés sont supprimés à chaque démarrage.
- **Tâche de fond** : au démarrage, l'API lance une boucle (`main.py`, `services/reminders.py`)
  qui, toutes les 15 minutes, prévient les inscrits des séances commençant dans les 24 h
  (notification, email si SMTP). Le travail SQL tourne dans un thread
  (`asyncio.to_thread`) pour ne pas bloquer les requêtes ; la table `session_reminders`
  garantit un seul rappel par sportif et par séance, même si l'API redémarre.

## Frontend (`frontend/src/app/`)

Organisation par fonctionnalité (feature-based), plutôt que par type de fichier :

```text
frontend/src/app/
├── core/         Bootstrap de l'application : app.component, app.config, routes, guard d'authentification
├── shared/        Code transverse réutilisé par plusieurs fonctionnalités
│   ├── components/  Composants UI génériques (conteneur des toasts)
│   ├── services/    Services transverses (toast, thème, statistiques)
│   ├── csv.ts       Export CSV pour Excel (séparateur ;, BOM, protection contre l'injection de formules)
│   └── download.ts  Enregistrement d'un fichier reçu (agenda .ics, CSV)
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
    ├── admin/           gestion des comptes et journal d'activité (côté admin)
    └── profile/         profil utilisateur
```

Chaque dossier de `features/` regroupe le composant de page et le service
Angular qui lui est propre (ex: `features/goals/goals.component.ts` et
`features/goals/goal.service.ts`). Quand un service est utilisé par plusieurs
fonctionnalités (ex: le tableau de bord agrège des données de plusieurs
domaines), il reste dans le dossier de la fonctionnalité qui en est
responsable et les autres l'importent via les alias TypeScript.

### Présentation des pages (style « module »)

Les écrans de liste (Séances, Participations, Statistiques, Objectifs, Journal,
Programmes, Notifications, Sportifs, Comptes, Profil) partagent la même structure,
définie dans `styles.css` :

- un éventuel résumé chiffré (`.cards` / `.stat-card`) ;
- un rail à gauche (`.module-rail`, un bouton `.module-rail-item` par élément, groupés
  par `.app-rail-section`) ;
- la fiche de l'élément sélectionné (`.module-detail-card`), qui contient aussi les
  formulaires de création (`.module-form`) et les actions (`.action-chip`).

Les couleurs passent par des variables CSS (`--accent-primary`, `--bg-surface`…) redéfinies
pour le thème sombre (`html[data-theme='dark']`). Les composants Angular Material (champs,
listes déroulantes et leurs options, interrupteurs) sont repeints avec ces mêmes variables :
le thème Material de base est clair et laisserait sinon du texte noir sur fond sombre.

La couleur d'un élément vient d'une classe `c-primary`, `c-secondary`, `c-info`,
`c-success`, `c-warning` ou `c-danger`. Sur ordinateur, une page portant la classe
`module-page` tient sur un seul écran (le rail et la fiche défilent en interne) ; sous
900 px, la navigation passe dans un menu burger et le rail devient une bande horizontale.

### Performances du frontend

- **Chargement à la demande** : chaque page est déclarée avec `loadComponent`
  (`core/app.routes.ts`) ; le navigateur ne télécharge au démarrage que le socle de
  l'application (540 Ko, soit 125 Ko transférés une fois compressés), puis le code d'une
  page la première fois qu'on l'ouvre.
- **Application installable (PWA)** : manifeste et service worker d'Angular ; le socle est
  mis en cache (ouverture hors ligne et démarrage instantané), jamais les réponses de l'API.
  Voir [frontend/README.md](../frontend/README.md).
- **Profil en mémoire** : `UserService.me()` n'interroge `/users/me` qu'une fois par
  connexion (le cache est vidé à la connexion et à la déconnexion, et mis à jour quand
  l'utilisateur modifie son profil). Un parcours de toutes les pages passe ainsi de 59
  à 48 appels à l'API.
- **Notifications** : le compteur de non lues est vérifié toutes les minutes, seulement
  quand l'onglet est visible (aucun appel pour un onglet en arrière-plan), et au retour
  sur l'onglet ; le minuteur tourne hors de la zone Angular.
- **Flux partagés** : quand une page lit la même donnée à deux endroits (graphique et
  liste des performances, par exemple), la requête est partagée avec `shareReplay`.

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
   automatiquement le token à chaque requête HTTP sortante ; quand le jeton d'accès
   (30 min) expire, il le renouvelle une fois avec le refresh token puis rejoue la
   requête. Le serveur fait tourner le refresh token à chaque renouvellement.
4. `authGuard` / `coachGuard` / `adminGuard` (`core/auth.guard.ts`) protègent les
   routes Angular définies dans `core/app.routes.ts` selon le rôle de
   l'utilisateur.
5. Côté backend, `security.py` valide le JWT et `dependencies.py` expose
   l'utilisateur courant aux routeurs qui en ont besoin.

Voir [ROLES.md](ROLES.md) pour le détail de ce que chaque rôle (sportif, coach,
admin) peut voir et faire dans l'application, et [SECURITE.md](SECURITE.md) pour les
protections (limitation des tentatives, détection de vol de jeton, déconnexion de
tous les appareils).

## Tests

- **Backend** (`backend/tests/`, Pytest) : tests unitaires (sécurité, schémas, dates)
  et tests d'API avec le `TestClient` de FastAPI. Les tests d'API tournent sur une base
  SQLite en mémoire recréée pour chaque test (`tests/conftest.py`), jamais sur la base
  SQL Server : inscription, en-têtes HTTP et CORS, index et compression, export agenda
  et duplication de séances, sécurité de l'authentification (blocage après plusieurs
  échecs, rotation et vol de refresh token, changement de mot de passe), permissions
  sur les comptes, séances et inscriptions, statistiques, objectifs, records et journal.
- **Frontend** (`*.spec.ts`, Vitest) : services (authentification, thème, toasts) et
  logique des composants (tableau de bord, séances à venir/passées, objectifs).
