# SportPlan — Frontend

Application Angular 22 (standalone components) consommant l'API FastAPI du
dossier [`../backend`](../backend). Voir [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
pour le détail de l'organisation du code.

## Commandes

```powershell
npm install       # installe les dépendances
npm start         # démarre le serveur de développement (ng serve) sur http://localhost:4200
npm run start:lan # idem, accessible depuis un téléphone du même Wi-Fi
npm run build     # build de production dans dist/ (avec le service worker)
npm run start:pwa # build de production puis version installable sur http://localhost:4300
npm test          # exécute les tests unitaires (Vitest)
```

## Application installable (PWA)

SportPlan peut s'installer comme une application (icône sur l'écran d'accueil, ouverture
en plein écran, raccourcis Séances / Calendrier / Statistiques) :

- `public/manifest.webmanifest` décrit l'application et ses icônes (`public/icons/`) ;
- le service worker d'Angular (`ngsw-config.json`) met en cache le socle de l'application :
  elle s'ouvre même sans réseau (les données, elles, demandent l'API). Les réponses de
  l'API ne sont **jamais** mises en cache : elles sont propres à chaque compte ;
- quand une nouvelle version est déployée, un message invite à recharger la page.

Le service worker n'existe que dans le build de production : `ng serve` ne l'active pas.
Pour l'essayer, lancer `npm run start:pwa` (petit serveur sans dépendance,
`scripts/serve-pwa.mjs`, qui renvoie `index.html` pour les routes Angular et ajoute les
en-têtes de sécurité, dont une politique de contenu stricte : voir
[docs/SECURITE.md](../docs/SECURITE.md)).

Les navigateurs n'installent une PWA que sur une origine sécurisée : **HTTPS** ou
`localhost`. Sur le PC, ouvrir `http://localhost:4300` puis « Installer SportPlan » dans
la barre d'adresse de Chrome ou Edge. Sur un téléphone du réseau local (adresse en
`http://192.168…`), deux possibilités :

1. simple raccourci : menu de Chrome › « Ajouter à l'écran d'accueil » (icône et nom
   SportPlan, mais ouverture dans le navigateur, sans mode hors ligne) ;
2. installation complète, pour une démonstration : dans Chrome sur le téléphone, ouvrir
   `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, ajouter
   `http://<IP du PC>:4300,http://<IP du PC>:8000`, activer, relancer Chrome, puis
   « Installer l'application ». Le pare-feu Windows doit autoriser le port 4300, comme
   4200 et 8000.

En production, l'application servie en HTTPS s'installe directement.

## Structure

```text
src/app/
├── core/        bootstrap de l'application, routes, guard d'authentification
├── shared/      composants et services réutilisés par plusieurs fonctionnalités
└── features/    un dossier par domaine métier (page + service co-localisés)
```

Alias TypeScript disponibles (voir `tsconfig.json`) : `@core/*`, `@shared/*`,
`@features/*`.

## Configuration de l'API

L'URL de l'API backend est définie dans [`src/app/core/api.config.ts`](src/app/core/api.config.ts).
Par défaut elle pointe vers `http://localhost:8000`.
