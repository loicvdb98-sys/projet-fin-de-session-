# Sécurité

Ce document recense les protections mises en place dans SportPlan, côté API
(FastAPI) et côté application (Angular). Chaque règle est couverte par des tests
(`backend/tests/`, `*.spec.ts`).

## Mots de passe

- **Hachage Argon2id** (`backend/app/security.py`) : le mot de passe n'est jamais
  stocké en clair, seule son empreinte l'est.
- **Politique de robustesse** (`check_password_strength`, `backend/app/schemas/user.py`),
  appliquée à l'inscription **et** au changement de mot de passe : 12 à 128 caractères,
  au moins une minuscule, une majuscule et un chiffre, pas d'espace, pas de mot de
  passe courant. Le formulaire Angular applique la même règle pour prévenir l'utilisateur
  avant l'envoi.
- **Changement de mot de passe** (`POST /auth/change-password`) : exige le mot de passe
  actuel, ferme les sessions ouvertes sur les autres appareils et renvoie une nouvelle
  paire de jetons pour l'appareil courant.

## Mot de passe oublié

- `POST /auth/forgot-password` envoie un lien `…/reset-password?token=…` : jeton aléatoire
  de 256 bits, stocké en base sous forme d'empreinte SHA-256 (table `password_reset_tokens`),
  **valable 30 minutes et à usage unique** ; une nouvelle demande annule le lien précédent.
- La réponse est **identique** que l'adresse corresponde à un compte ou non.
- Le lien reprend l'adresse du front d'où vient la demande **seulement si elle fait partie
  des origines autorisées** (`ALLOWED_ORIGINS`, `ALLOWED_ORIGIN_REGEX`), sinon `FRONTEND_URL` :
  un attaquant ne peut pas faire envoyer à sa victime un lien vers son propre site pour y
  récupérer le jeton (« empoisonnement » du lien de réinitialisation).
- `POST /auth/reset-password` applique la politique de mot de passe, ferme toutes les
  sessions du compte et lève un éventuel blocage dû aux échecs de connexion.
- Limites : 10 appels par minute et par IP, et 3 demandes de lien par adresse et par
  quart d'heure (pas d'inondation de boîte mail).
- Sans serveur SMTP configuré, le lien est écrit dans la console de l'API (développement
  et démonstration) ; avec `SMTP_HOST`, il part par email chiffré (STARTTLS).

## Jetons JWT

| Jeton | Durée | Stockage côté serveur |
| --- | --- | --- |
| Accès (`access`) | 30 minutes | aucun (vérifié par sa signature) |
| Rafraîchissement (`refresh`) | 7 jours | empreinte SHA-256 en base (`refresh_tokens`), jamais le jeton en clair |

- Signature HS256 avec une clé `SECRET_KEY` d'au moins 32 caractères : l'API refuse de
  démarrer avec une clé plus courte.
- Bibliothèque **PyJWT**, maintenue (elle remplace `python-jose`, abandonnée et touchée
  par des failles connues, CVE-2024-33663 et CVE-2024-33664). Seul l'algorithme HS256
  est accepté : un jeton non signé (`alg: none`) ou signé avec une autre clé est refusé,
  de même qu'un jeton sans `sub`, `type`, `iat` ou `exp`.
- Chaque jeton porte un identifiant unique aléatoire (`jti`) : deux jetons émis dans la
  même seconde restent distincts.
- **Rotation** : chaque `POST /auth/refresh` révoque le refresh token présenté et en
  émet un nouveau.
- **Détection de vol** : si un refresh token déjà remplacé est présenté à nouveau plus
  de 60 secondes après sa rotation, toutes les sessions du compte sont fermées (le
  jeton a probablement été copié). Dans les 60 secondes, il est seulement refusé : c'est
  le cas de deux onglets qui renouvellent leur session au même moment.
- **Déconnexion** : `POST /auth/logout` révoque le jeton de l'appareil ;
  `POST /auth/logout-all` (bouton « Se déconnecter de tous les appareils » dans
  Profil › Sécurité) révoque ceux de tous les appareils.
- **Compte désactivé** par un admin : ses refresh tokens sont révoqués et chaque requête
  est refusée immédiatement (`get_current_user` vérifie `is_active` à chaque appel).
- Limite connue : un jeton d'accès déjà émis reste valable jusqu'à son expiration
  (30 minutes au plus) après une déconnexion, comme pour tout JWT sans état.

## Force brute et énumération des comptes

Limites en mémoire (`backend/app/rate_limit.py`), réponse `429 Too Many Requests` :

| Cible | Limite |
| --- | --- |
| Connexion et inscription, par adresse IP | 10 appels par minute |
| Connexion, par compte | 5 échecs en 15 minutes bloquent le compte, même si l'attaquant change d'adresse IP |
| Changement de mot de passe, par utilisateur | 5 tentatives par minute |
| Lien « mot de passe oublié », par adresse email | 3 demandes par quart d'heure |

- Un email inconnu reçoit exactement la même réponse qu'un mauvais mot de passe, dans
  le même temps : le mot de passe est comparé à une empreinte de référence, ce qui
  empêche de deviner quels emails ont un compte.
- Les échecs de connexion sont journalisés avec l'email échappé (`%r`) : un email
  forgé ne peut pas insérer de fausses lignes dans le journal.
- Ces compteurs vivent dans le processus de l'API : ils repartent de zéro à chaque
  redémarrage et ne sont pas partagés entre plusieurs instances.

## Journal d'activité (traçabilité)

Les événements de sécurité sont enregistrés dans la table `audit_events`
(`backend/app/services/audit.py`) et consultables par un admin sur la page
**Journal d'activité** (`GET /admin/audit`, réservé au rôle admin) :

| Catégorie | Événements |
| --- | --- |
| Connexions | connexion réussie, nouveau compte, déconnexion de tous les appareils |
| Échecs et blocages | connexion refusée (email saisi, adresse IP), compte bloqué 15 minutes |
| Comptes | rôle modifié (ancien → nouveau rôle, par quel admin), compte désactivé ou réactivé |
| Mots de passe | mot de passe changé, lien de réinitialisation demandé, mot de passe réinitialisé |
| Alertes | compte bloqué, vol de jeton détecté, compte désactivé |

Chaque événement est aussi écrit dans la console de l'API (avec l'heure). Les événements de
plus de 180 jours sont supprimés au démarrage. L'adresse IP est celle de la connexion : derrière
un proxy, il faudrait lire l'en-tête `X-Forwarded-For` d'un proxy de confiance.

## En-têtes HTTP et CORS

Chaque réponse de l'API porte des en-têtes de protection (`backend/app/main.py`) :

| En-tête | Effet |
| --- | --- |
| `X-Content-Type-Options: nosniff` | le navigateur n'interprète pas une réponse JSON comme un script |
| `X-Frame-Options: DENY` et `frame-ancestors 'none'` | l'API ne peut pas être affichée dans une iframe |
| `Content-Security-Policy: default-src 'none'` | une réponse de l'API ne peut charger aucune ressource (sauf les pages de documentation) |
| `Referrer-Policy: no-referrer` | aucune adresse n'est transmise aux sites tiers |
| `Cache-Control: no-store` (routes `/auth`) | les jetons ne sont jamais mis en cache |

- **CORS** : seules les origines de `ALLOWED_ORIGINS` (et `ALLOWED_ORIGIN_REGEX`) sont
  acceptées, avec les seules méthodes `GET`, `POST`, `PATCH`, `DELETE` et les en-têtes
  `Authorization` et `Content-Type`. Le jeton voyage dans l'en-tête `Authorization` et
  jamais dans un cookie : les identifiants (`allow_credentials`) sont refusés.
- **Documentation** : `/docs`, `/redoc` et `/openapi.json` se désactivent en production
  avec `EXPOSE_API_DOCS=false`.

## Politique de sécurité du contenu (frontend)

La version de production (`npm run start:pwa`, `frontend/scripts/serve-pwa.mjs`) est servie
avec une **CSP** stricte : seuls les scripts du build peuvent s'exécuter (`script-src 'self'`,
aucun script en ligne), et les requêtes ne peuvent partir que vers le site lui-même et l'API
(`connect-src 'self' http://<hôte>:8000`). Même si un script malveillant parvenait à être
injecté dans la page, il ne pourrait ni s'exécuter ni envoyer les jetons ailleurs. S'y
ajoutent `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` et `Permissions-Policy`.

Pour que cette politique fonctionne, l'intégration du CSS « critique » d'Angular est désactivée
(`inlineCritical: false` dans `angular.json`) : elle ajoutait un gestionnaire `onload` en ligne,
que la CSP aurait bloqué (la page serait restée sans style). Les styles en ligne restent
autorisés, car Angular et Material en injectent.

## Application installable (PWA)

Le service worker ne met en cache que les fichiers de l'application (HTML, JavaScript, CSS,
icônes), jamais les réponses de l'API : sur un appareil partagé, un autre compte ne peut
pas retrouver les données du précédent dans le cache. Il n'est actif que sur une origine
sécurisée (HTTPS ou `localhost`), comme l'imposent les navigateurs.

## Exports CSV

Les exports (participations, performances, assiduité) sont générés dans le navigateur à
partir des données que l'API a déjà autorisées pour l'utilisateur. Une cellule de texte
qui commence par `=`, `+`, `-` ou `@` est préfixée d'une apostrophe (`shared/csv.ts`) :
Excel l'afficherait sinon comme une formule, ce qui permettrait à un titre de séance piégé
d'exécuter une formule chez la personne qui ouvre le fichier (injection de formules CSV).

## Droits d'accès

- Chaque endpoint protégé exige un jeton d'accès valide (`get_current_user`) et, si
  besoin, un rôle (`require_roles("coach", "admin")`).
- Les règles de propriété sont vérifiées côté serveur (un sportif ne modifie que ses
  données, un coach que ses séances) ; les gardes Angular ne font que masquer les écrans.
- L'inscription publique ne crée que des comptes sportif ; seul un admin attribue les
  rôles coach et admin, et personne ne peut changer son propre rôle ni désactiver son
  propre compte.
- Les données envoyées sont validées par des schémas Pydantic (rôles limités à
  `sportif`, `coach`, `admin`, noms normalisés, longueurs bornées).

Le détail par rôle est dans [ROLES.md](ROLES.md).
