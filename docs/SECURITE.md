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

## Jetons JWT

| Jeton | Durée | Stockage côté serveur |
| --- | --- | --- |
| Accès (`access`) | 30 minutes | aucun (vérifié par sa signature) |
| Rafraîchissement (`refresh`) | 7 jours | empreinte SHA-256 en base (`refresh_tokens`), jamais le jeton en clair |

- Signature HS256 avec une clé `SECRET_KEY` d'au moins 32 caractères : l'API refuse de
  démarrer avec une clé plus courte.
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

- Un email inconnu reçoit exactement la même réponse qu'un mauvais mot de passe, dans
  le même temps : le mot de passe est comparé à une empreinte de référence, ce qui
  empêche de deviner quels emails ont un compte.
- Les échecs de connexion sont journalisés avec l'email échappé (`%r`) : un email
  forgé ne peut pas insérer de fausses lignes dans le journal.
- Ces compteurs vivent dans le processus de l'API : ils repartent de zéro à chaque
  redémarrage et ne sont pas partagés entre plusieurs instances.

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
