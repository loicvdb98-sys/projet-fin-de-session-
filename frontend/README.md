# SportPlan — Frontend

Application Angular 22 (standalone components) consommant l'API FastAPI du
dossier [`../backend`](../backend). Voir [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
pour le détail de l'organisation du code.

## Commandes

```powershell
npm install       # installe les dépendances
npm start         # démarre le serveur de développement (ng serve) sur http://localhost:4200
npm run build     # build de production dans dist/
npm test          # exécute les tests unitaires (Vitest)
```

## Structure

```text
src/app/
├── core/        bootstrap de l'application, routes, guard d'authentification
├── shared/      composants, services et données réutilisés par plusieurs fonctionnalités
└── features/    un dossier par domaine métier (page + service co-localisés)
```

Alias TypeScript disponibles (voir `tsconfig.json`) : `@core/*`, `@shared/*`,
`@features/*`.

## Configuration de l'API

L'URL de l'API backend est définie dans [`src/app/core/api.config.ts`](src/app/core/api.config.ts).
Par défaut elle pointe vers `http://localhost:8000`.

## Mode démonstration

Certains services (`user.service.ts`, `goal.service.ts`, `performance.service.ts`,
`statistics.service.ts`) peuvent servir des données statiques définies dans
[`src/app/shared/data/demo-data.ts`](src/app/shared/data/demo-data.ts) lorsque
`DEMO_MODE` est actif, ce qui permet de faire fonctionner l'interface sans API
backend disponible (démonstration, développement isolé).
