# Rôles et permissions

SportPlan distingue trois rôles, stockés dans `users.role` (`sportif`,
`coach`, `admin`). Le rôle est fixé à l'inscription (toujours `sportif`,
voir [`POST /auth/register`](../backend/app/routers/auth.py)) et ne peut être
changé ensuite que par un admin, depuis [Gestion des comptes](#admin).

Le frontend ne fait jamais confiance à une valeur de rôle mise en cache côté
client pour la sécurité : chaque écran protégé correspond à un endpoint qui
revérifie le rôle côté serveur (`require_roles(...)` dans les routeurs
FastAPI). Les guards Angular (`core/auth.guard.ts`) et les conditions
d'affichage (`AuthService.isCoachOrAdmin()` / `isAdmin()`) ne servent qu'à
l'expérience utilisateur : cacher un lien de navigation, rediriger avant un
appel API inutile.

## Sportif

Rôle par défaut. Peut :

- Consulter les séances disponibles et s'inscrire, tant qu'il reste des
  places (`registered_count < capacity`, affiché comme « X place(s) » ou
  « Complet » sur chaque séance).
- Voir ses participations passées/à venir et se désinscrire
  (page **Mes participations**).
- Recevoir un rappel (toast) quand une séance à laquelle il est inscrit
  commence dans moins de 3h (voir `AppComponent.checkUpcomingReminders`).
- Suivre ses performances, objectifs, programmes et son journal
  d'entraînement — toujours restreints à ses propres données côté backend
  (`WHERE user_id = current_user.id`).
- Modifier son propre profil et mot de passe.

Ne peut pas : créer/modifier/supprimer une séance, voir la liste des
sportifs suivis, gérer les comptes.

## Coach

Tout ce qu'un sportif peut faire, plus :

- Créer une séance (`/workouts/new` ou l'éditeur intégré à **Vos séances**),
  toujours en tant qu'animateur de sa propre séance
  (`coach_id` doit être son propre id).
- Modifier ou annuler (supprimer) les séances qu'il anime — un coach ne peut
  pas toucher aux séances d'un autre coach.
- Suivre les présences : depuis **Vos séances**, le bouton **Présences**
  liste les inscrits d'une séance et permet de les marquer
  Inscrit / Présent / Absent.
- Voir la liste de ses sportifs suivis (page **Sportifs**) et leur détail.

Ne peut pas : modifier une séance d'un autre coach, changer le rôle ou le
statut actif d'un compte.

## Admin

Rôle de supervision, avec accès à tout ce qu'un coach peut faire, sans la
restriction de propriété :

- Modifier ou annuler **n'importe quelle** séance, quel que soit le coach qui
  l'a créée.
- Marquer les présences sur n'importe quelle séance.
- **Gestion des comptes** (`/admin/users`, page réservée via `adminGuard`) :
  liste tous les comptes, change leur rôle (sportif/coach/admin) et
  active/désactive un compte. L'admin ne peut pas modifier sa propre ligne
  depuis cet écran, pour éviter de se retirer ses propres droits par erreur.

## Tableau récapitulatif

| Action | Sportif | Coach | Admin |
| --- | :---: | :---: | :---: |
| S'inscrire à une séance | ✅ | ✅ | ✅ |
| Créer une séance | ❌ | ✅ (les siennes) | ✅ |
| Modifier/annuler une séance | ❌ | ✅ (les siennes) | ✅ (toutes) |
| Marquer une présence | ❌ | ✅ (ses séances) | ✅ (toutes) |
| Voir la liste des sportifs | ❌ | ✅ | ✅ |
| Gérer les comptes (rôle, actif/inactif) | ❌ | ❌ | ✅ |

## Où c'est appliqué dans le code

| Règle | Frontend (UX) | Backend (source de vérité) |
| --- | --- | --- |
| Écrans coach | `coachGuard`, `AuthService.isCoachOrAdmin()` | `require_roles("coach", "admin")` |
| Écran admin | `adminGuard`, `AuthService.isAdmin()` | vérifications `current.role == "admin"` dans `routers/users.py` |
| Propriété d'une séance | `SessionsComponent.canManageSession()` | `if user.role == "coach" and item.coach_id != user.id` dans `routers/sessions.py` |
