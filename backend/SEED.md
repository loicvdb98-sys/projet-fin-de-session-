# Données de démonstration

Depuis le dossier `backend`, configurez d'abord `.env`, puis exécutez :

```powershell
python seed.py
```

Le script est idempotent : il peut être relancé sans dupliquer les comptes, séances,
participations, performances, objectifs, programmes ou entrées de journal de
démonstration. Il peuple l'application avec un jeu de données cohérent (séances
passées et futures, présences variées, progression de performance, objectifs,
records personnels, programmes, journal, notifications) pour qu'elle ne paraisse
pas vide lors d'une démonstration.

Comptes créés :

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Coach | `coach.demo@sportplan.dev` | `SportPlanDemo2026!` |
| Sportif (compte principal) | `sportif.demo@sportplan.dev` | `SportPlanDemo2026!` |
| Admin | `admin.demo@sportplan.dev` | `SportPlanDemo2026!` |
| Sportif | `lea.martin@sportplan.dev` | `SportPlanDemo2026!` |
| Sportif | `thomas.dupont@sportplan.dev` | `SportPlanDemo2026!` |
| Sportif | `ines.bernard@sportplan.dev` | `SportPlanDemo2026!` |

Les comptes sont réservés au développement local. Changez les mots de passe avant
toute utilisation sur un environnement partagé ou de production.

## Retirer les données de démonstration

Comme ce ne sont pas de vraies données, un script symétrique les supprime
entièrement avant une utilisation réelle de l'application :

```powershell
python reset_demo.py
```

Il identifie tout ce qui appartient aux comptes `@sportplan.dev` (créés par
`seed.py`) — séances, participations, performances, objectifs, records,
programmes, journal, notifications — et les supprime, sans toucher aux comptes
que de vrais utilisateurs auraient créés via l'inscription normale.
