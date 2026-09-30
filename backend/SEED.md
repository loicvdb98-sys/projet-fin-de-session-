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

## Avant une présentation

Les dates du jeu de démonstration sont calculées par rapport au jour où
`seed.py` est lancé (séances passées à J-16…J-3, séances à venir à J+2…J+9).
Quelques jours plus tard, les séances « à venir » sont donc déjà passées et le
sportif de démo n'a plus d'inscription future. La veille d'une démonstration,
rechargez le jeu de données :

```powershell
python reset_demo.py
python seed.py
```

`reset_demo.py` supprime aussi les séances créées à la main avec le compte coach
de démo : sauvegardez la base avant si elles doivent être conservées.

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

## Démontrer « mot de passe oublié »

Sans serveur SMTP configuré, le lien de réinitialisation n'est pas envoyé par email :
il est écrit dans la console où tourne l'API (`uvicorn`), sur une ligne
`Email non envoyé (SMTP non configuré)`. Copiez l'adresse `…/reset-password?token=…`
dans le navigateur. Pour ne pas modifier un compte de démonstration, choisissez à
nouveau le mot de passe `SportPlanDemo2026!`. Le lien est valable 30 minutes et ne
sert qu'une fois.
