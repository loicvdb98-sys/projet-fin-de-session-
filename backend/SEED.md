# Données de démonstration

Depuis le dossier `backend`, configurez d'abord `.env`, puis exécutez :

```powershell
python seed.py
```

Le script est idempotent : il peut être relancé sans dupliquer les comptes, séances,
participations ou performances de démonstration.

Comptes créés :

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Coach | `coach.demo@sportplan.dev` | `SportPlanDemo2026!` |
| Sportif | `sportif.demo@sportplan.dev` | `SportPlanDemo2026!` |
| Admin | `admin.demo@sportplan.dev` | `SportPlanDemo2026!` |

Les comptes sont réservés au développement local. Changez les mots de passe avant
toute utilisation sur un environnement partagé ou de production.
