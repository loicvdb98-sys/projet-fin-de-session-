# Rôles et permissions

SportPlan distingue trois rôles, stockés dans `users.role` (`sportif`,
`coach`, `admin`). Le rôle est fixé à l'inscription (toujours `sportif` :
[`POST /auth/register`](../backend/app/routers/auth.py) refuse tout autre rôle
avec une 403) et ne peut être changé ensuite que par un admin, depuis
[Gestion des comptes](#admin). Personne ne peut changer son propre rôle ni
désactiver son propre compte, même via l'API.

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
- Rechercher une séance par titre, coach ou description (sans tenir compte des
  accents) et filtrer la liste : **Mes inscriptions**, **Places libres**,
  **7 prochains jours** (pour un coach, **Mes séances** inclut celles qu'il anime).
- Voir ses participations passées/à venir et se désinscrire
  (page **Mes participations**), avec un résumé (à venir, terminées, taux
  de présence).
- Ajouter une séance à son agenda (bouton **Ajouter à l'agenda**, fichier `.ics`
  avec un rappel une heure avant), ou exporter d'un coup toutes les séances à venir
  où il est inscrit (bouton **Exporter mon agenda** de la page **Vos séances**).
- Recevoir un rappel (toast), à l'ouverture de l'application, quand une séance
  à laquelle il est inscrit commence dans moins de 3h (voir
  `AppComponent.checkUpcomingReminders`).
- Suivre ses performances, objectifs, programmes et son journal
  d'entraînement — toujours restreints à ses propres données côté backend
  (`WHERE user_id = current_user.id`) : mettre à jour la progression d'un
  objectif (avec, pour un objectif en séances, le nombre de séances suivies
  depuis le 1er du mois), supprimer un record, modifier ou supprimer un bilan
  de son journal.
- Sur la page **Statistiques**, consulter en plus son propre historique
  d'assiduité (module **Assiduité**), calculé sur ses participations aux
  séances passées.
- Exporter ses participations et ses performances au format CSV (bouton
  **Exporter (CSV)** des pages **Mes participations** et **Statistiques**),
  pour les ouvrir dans Excel.
- Modifier son propre profil et mot de passe (ce qui déconnecte ses autres appareils),
  et se déconnecter de tous les appareils depuis Profil › Sécurité.

Ne peut pas : créer/modifier/supprimer une séance, voir la liste des
sportifs suivis, gérer les comptes, ni modifier son statut de présence (un
sportif marqué absent ne peut pas se remettre « inscrit »).

## Coach

Tout ce qu'un sportif peut faire, plus :

- Créer une séance (`/workouts/new` ou l'éditeur intégré à **Vos séances**),
  toujours en tant qu'animateur de sa propre séance
  (`coach_id` doit être son propre id).
- Modifier ou annuler (supprimer) les séances qu'il anime — un coach ne peut
  pas toucher aux séances d'un autre coach.
- **Dupliquer** une de ses séances : la copie reprend le titre, la description,
  la durée, les places et les exercices (sans les inscrits), au même créneau la
  semaine suivante (ou la première semaine à venir si la séance est passée).
- **Répéter** une séance chaque semaine (1 à 12 semaines) pour planifier un cycle
  en une fois, depuis sa fiche ou dès la création (champ « Répéter chaque semaine »
  de la page **Créer une séance**).
- Son export d'agenda contient aussi les séances à venir qu'il anime.
- Suivre les présences : depuis **Vos séances**, le bouton **Présences**
  liste les inscrits d'une séance et permet de les marquer
  Inscrit / Présent / Absent.
- Voir la liste des sportifs (page **Sportifs**) et leur suivi détaillé, et
  exporter leur assiduité en CSV (une ligne par sportif : présences, taux,
  séances à venir, dernière présence).
- Repérer les sportifs **à relancer** : un bandeau sur le tableau de bord et une
  pastille sur la page **Sportifs** signalent, par ordre de priorité, un sportif
  absent aux deux dernières séances, présent à moins de 50 % sur au moins trois
  séances, sans présence depuis 21 jours et sans séance à venir, ou jamais inscrit
  (règle `attendanceAlert`, `features/athletes/attendance.ts`).
- Ses exports **Participations** et **Statistiques** couvrent les inscriptions et
  performances de ses séances, avec le nom du sportif.
- Lire les bilans de journal écrits après ses séances (avec le nom du
  sportif) et y ajouter son commentaire — sans pouvoir modifier ni supprimer
  le bilan lui-même.
- Sur la page **Participations**, voir toutes les inscriptions des séances
  qu'il anime (nom du sportif, statut), et sur **Statistiques**, le taux de
  présence par séance (module **Assiduité**) et les performances de ses
  sportifs.

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
  active/désactive un compte. L'admin ne peut pas modifier son propre rôle ni
  désactiver son propre compte (ni depuis cet écran, ni via l'API), pour
  éviter de se retirer ses propres droits par erreur.

## Tableau récapitulatif

| Action | Sportif | Coach | Admin |
| --- | :---: | :---: | :---: |
| S'inscrire à une séance | ✅ | ✅ | ✅ |
| Créer une séance | ❌ | ✅ (les siennes) | ✅ |
| Modifier/annuler une séance | ❌ | ✅ (les siennes) | ✅ (toutes) |
| Marquer une présence | ❌ | ✅ (ses séances) | ✅ (toutes) |
| Commenter un bilan de journal | ❌ | ✅ (ses séances) | ✅ |
| Voir la liste des sportifs | ❌ | ✅ | ✅ |
| Gérer les comptes (rôle, actif/inactif) | ❌ | ❌ | ✅ |

## Où c'est appliqué dans le code

| Règle | Frontend (UX) | Backend (source de vérité) |
| --- | --- | --- |
| Écrans coach | `coachGuard`, `AuthService.isCoachOrAdmin()` | `require_roles("coach", "admin")` |
| Écran admin | `adminGuard`, `AuthService.isAdmin()` | vérifications `current.role == "admin"` dans `routers/users.py` |
| Propriété d'une séance | `SessionsComponent.canManageSession()` | `if user.role == "coach" and item.coach_id != user.id` dans `routers/sessions.py` |
| Inscription toujours « sportif » | le formulaire envoie `role: 'sportif'` | 403 si un autre rôle est demandé dans `routers/auth.py` |
| Pas de modification de son propre rôle / statut | ligne « Votre compte » non modifiable dans Comptes | 403 dans `update_user` (`routers/users.py`) |
| Présence réservée au coach de la séance | bouton **Présences** visible pour le coach | 403 dans `update_participation` (`routers/participations.py`) |
| Bilan : l'auteur modifie/supprime, le coach commente | actions de la fiche dans `JournalComponent` | `update_journal` / `delete_journal` (`routers/journal.py`) |

Ces règles sont couvertes par les tests d'API de `backend/tests/` (`test_api_*.py`).
