# Pré-présentation du projet — guide oral (20 min)

> À compléter avant jeudi : les éléments entre crochets correspondent à vos informations personnelles ou à un exemple réel de l'application.

## Objectif

Présenter **une application de gestion et de suivi de séances sportives** : l'utilisateur peut organiser ses entraînements, suivre ses performances et rester motivé grâce à des objectifs, programmes et notifications.

La présentation doit répondre simplement à quatre questions : qui suis-je, quel problème résout mon projet, comment est-il construit et que fonctionne-t-il concrètement ?

## Déroulé et timing

| Partie | Durée cible | Diapositives suggérées |
| --- | ---: | --- |
| Présentation personnelle | 2 min | 1 |
| Sujet, besoin et solution | 4 min | 2–3 |
| Stack technique et architecture | 4 min | 2–3 |
| Démonstration et code | 10 min | 3–5 |
| **Total** | **20 min max** | **8–12** |

---

## 1. Présentation personnelle — 2 min maximum

**À dire :**

> Bonjour, je m'appelle **[nom et prénom]**, j'ai **[âge]** ans. Mon parcours est **[parcours]**. Je me suis orienté vers le développement informatique parce que **[raison personnelle]**. J'apprécie particulièrement **[front-end / back-end / conception d'applications / autre]**, ce qui m'a amené à réaliser ce projet.

Restez concis : l'objectif est de donner votre contexte, pas de raconter tout votre parcours.

> **Visuel PowerPoint :** ajoute une photo professionnelle de toi ou une illustration liée au développement. Évite une capture de l'application sur cette diapositive.

## 2. Le projet : besoin, utilisateurs et solution — environ 4 min

### Le problème

Une personne qui s'entraîne doit souvent utiliser plusieurs outils ou noter ses informations séparément : séances, performances, objectifs et progression. Cela rend le suivi moins clair et peut diminuer la motivation.

> **Visuel PowerPoint :** une icône ou un schéma simple illustrant le problème : plusieurs notes/outils dispersés → une seule application de suivi.

### La solution

Le projet est une application web de gestion de séances sportives. Elle centralise le suivi de l'entraînement dans une seule interface.

> **📸 Capture à placer — écran d'accueil / tableau de bord :** une capture large de la page `Dashboard`. C'est la première vraie image de l'application : elle doit montrer en un regard les statistiques, les informations clés ou la navigation.

### Public cible

- Les sportifs qui souhaitent organiser leurs séances et suivre leurs progrès.
- Éventuellement, les coachs qui souhaitent suivre des athlètes via la page dédiée.

### Fonctionnalités principales

- Authentification et profil utilisateur.
- Création et consultation de séances d'entraînement.
- Calendrier des séances et participations.
- Suivi des performances et statistiques, avec graphiques.
- Objectifs et records personnels.
- Programmes d'entraînement, journal de suivi et notifications.
- Gestion d'athlètes selon les besoins de l'utilisateur.

> **📸 Capture à placer — aperçu des fonctionnalités :** crée une mosaïque de 3 ou 4 petites captures : tableau de bord, calendrier, performances et objectifs. Ne mets pas de texte illisible dans les miniatures ; elles servent seulement à montrer l'étendue du projet.

**Formulation courte à mémoriser :**

> Je développe une application qui aide les sportifs à planifier leurs entraînements, enregistrer leurs résultats et visualiser leur progression, afin d'avoir un suivi simple et centralisé.

## 3. Stack technique et architecture — environ 4 min

### Technologies utilisées

| Couche | Technologies | Rôle dans le projet |
| --- | --- | --- |
| Frontend | Angular 22, TypeScript, Angular Material | Interface responsive, navigation et formulaires utilisateur |
| Visualisation | Chart.js | Affichage de statistiques sous forme de graphiques |
| Backend | Python, FastAPI | API REST et logique métier |
| Base de données | SQL Server via SQLAlchemy et pyodbc | Persistance des utilisateurs, séances, performances, etc. |
| Sécurité | JWT, Argon2, CORS | Authentification, protection des mots de passe et contrôle des accès |
| Qualité | Pytest / Vitest | Tests du backend et du frontend |

### Organisation du code

```text
frontend/src/app/
├── pages/       écrans : tableau de bord, séances, objectifs, programmes…
├── services/    appels à l'API et logique partagée
├── auth.guard.ts
└── auth.interceptor.ts

backend/app/
├── routers/     endpoints REST regroupés par domaine
├── models/      modèles SQLAlchemy
├── schemas/     validation et structure des données échangées
├── services/    logique métier réutilisable
├── security.py  JWT et hachage des mots de passe
└── database.py  connexion et sessions de base de données
```

> **Visuel PowerPoint :** transforme cette arborescence en schéma avec trois blocs : **Angular (frontend)** ↔ **FastAPI (API)** ↔ **SQL Server (base de données)**. Ajoute des flèches entre les blocs. N'affiche pas toute l'arborescence sur la diapositive.

### Justification des choix

> J'ai séparé l'interface Angular du backend FastAPI afin que chaque partie ait une responsabilité claire. Côté backend, les routes reçoivent les requêtes, les schémas valident les données et les modèles représentent la base de données. Cette organisation facilite la maintenance, les tests et l'ajout de nouvelles fonctionnalités.

> L'authentification s'appuie sur des jetons JWT. Les routes protégées du frontend utilisent un guard, tandis qu'un interceptor ajoute le jeton aux requêtes API. Cela évite qu'un utilisateur non connecté accède aux données privées.

> **📸 Capture à placer — sécurité :** capture de la page de connexion, éventuellement accompagnée d'un petit schéma `Connexion → JWT → routes protégées`. Cette image est optionnelle si vous présentez l'authentification comme fonctionnalité technique.

## 4. Démonstration de fonctionnalités — environ 10 min

Ne cherchez pas à tout montrer. Préparez **deux fonctionnalités solides** : une démonstration utilisateur courte, puis un point de code précis et compréhensible.

### Fonctionnalité A — Créer une séance ou un programme

> **📸 Capture à placer — création :** capture nette de la page de création de séance (`/workouts/new`) ou de programme. Le formulaire doit être rempli avec un exemple réaliste pour qu'on voie les champs et les exercices. Encadrez discrètement les zones importantes si nécessaire.

**Démonstration interface (≈ 2 min)**

1. Se connecter avec un compte de démonstration.
2. Ouvrir la création de séance (`/workouts/new`) ou les programmes.
3. Saisir un entraînement et ses exercices.
4. Enregistrer, puis montrer le résultat dans la liste ou le calendrier.
5. Si possible, montrer une validation en cas de champ manquant.

> **📸 Capture optionnelle — validation :** une seconde capture du formulaire affichant un message d'erreur ou une validation. À utiliser seulement si elle reste lisible.

**Point technique à montrer (≈ 2–3 min)**

- Le formulaire Angular et sa validation.
- Le service Angular qui envoie la requête à l'API.
- La route FastAPI correspondante, le schéma Pydantic et le modèle SQLAlchemy.

> **📸 Capture à placer — code de création :** capture courte du code, limitée à la méthode de soumission du formulaire **ou** à l'endpoint FastAPI. Surlignez 3 à 5 lignes utiles, sans afficher un fichier entier.

**Phrase de transition :**

> Côté utilisateur, la création est rapide. Côté technique, les données sont validées d'abord dans le formulaire, puis à nouveau par le backend avant d'être enregistrées en base de données.

### Fonctionnalité B — Suivre une performance et un objectif

> **📸 Capture à placer — progression :** capture de la page `Performances`, `Goals` ou du tableau de bord, avec un graphique, un record personnel ou un objectif visible. Choisissez des données de démonstration qui rendent l'évolution évidente.

**Démonstration interface (≈ 2 min)**

1. Ouvrir la page des performances ou le tableau de bord.
2. Ajouter ou afficher une performance existante.
3. Montrer le graphique, le record personnel ou l'évolution.
4. Ouvrir un objectif et expliquer le lien avec le suivi de progression.

> **📸 Capture optionnelle — détail d'objectif :** capture de la page des objectifs avec un objectif atteint ou en cours. Elle est utile si l'écran principal ne montre pas clairement le lien entre performance et objectif.

**Point technique à montrer (≈ 2–3 min)**

- Le service de statistiques/performance qui consomme l'API.
- Les modèles `Performance`, `Goal` et `PersonalRecord`.
- Le calcul ou l'agrégation renvoyée par l'endpoint de statistiques.
- L'affichage de ces données dans Chart.js.

> **📸 Capture à placer — code statistiques :** capture de l'appel API ou du code qui prépare les données du graphique. Montrez uniquement la partie qui explique la valeur technique de la fonctionnalité.

**Phrase de transition :**

> Cette fonctionnalité ne se contente pas de stocker une valeur : elle transforme les données d'entraînement en indicateurs visuels utiles pour mesurer la progression.

### Alternative si elle est mieux aboutie — Authentification sécurisée

Montrez la connexion, puis expliquez brièvement : mot de passe haché avec Argon2, création d'un JWT côté FastAPI, stockage/usage du jeton côté Angular, interceptor pour les requêtes et `authGuard` pour bloquer les pages protégées.

> **📸 Capture à placer :** écran de connexion avec une erreur de connexion contrôlée ou une redirection vers une page protégée. Pour le code, capturez soit `auth.guard.ts`, soit l'interceptor, jamais les deux sur la même diapositive.

## 5. Questions probables : réponses à préparer

| Question | Angle de réponse |
| --- | --- |
| Pourquoi Angular ? | Structure par composants, routage et outillage adapté à une application riche. |
| Pourquoi FastAPI ? | API REST rapide à développer, schémas de validation clairs et documentation automatique. |
| Pourquoi séparer frontend et backend ? | Responsabilités distinctes, maintenance plus simple et API réutilisable. |
| Comment protégez-vous les comptes ? | Hachage Argon2, JWT et protection des routes côté frontend et backend. |
| Pourquoi SQLAlchemy ? | ORM : modèles Python cohérents avec la base, requêtes plus maintenables. |
| Quelle difficulté avez-vous rencontrée ? | Préparez un exemple réel : authentification, relations de données, affichage des graphiques ou synchronisation frontend/API. Expliquez la solution apportée. |
| Quelle serait la prochaine évolution ? | [Ex. partage avec un coach, rappels plus avancés, application mobile, export des statistiques.] |

## Checklist avant de présenter

- [ ] Mes informations personnelles et mon introduction sont prêtes.
- [ ] Je peux expliquer le problème, la cible et l'objectif en moins d'une minute.
- [ ] J'ai choisi deux démonstrations qui fonctionnent avec des données réalistes.
- [ ] J'ai préparé un compte de démonstration et vérifié la connexion frontend / backend.
- [ ] J'ai ouvert à l'avance les fichiers de code précis à montrer.
- [ ] Je connais le rôle de chaque dossier important.
- [ ] J'ai chronométré une répétition complète : 20 minutes maximum.
- [ ] Mon PowerPoint contient des mots-clés, des schémas et des captures, pas des paragraphes à lire.
- [ ] Chaque capture est recadrée, lisible et ne contient aucune donnée personnelle ou sensible.
- [ ] Pour chaque fonctionnalité, j'ai une capture de l'interface et une capture courte du code associé.

## Conclusion — 20 à 30 secondes

> Pour conclure, ce projet répond au besoin de centraliser le suivi sportif : planifier, enregistrer et analyser ses entraînements. J'ai construit une application Angular et FastAPI organisée autour d'une API sécurisée et d'une base de données relationnelle. Les fonctionnalités présentées montrent à la fois la valeur pour l'utilisateur et les choix techniques réalisés.
