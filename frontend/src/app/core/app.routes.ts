/**
 * Table de routage de l'application : associe chaque URL à son composant
 * de fonctionnalité et protège les écrans sensibles via authGuard/coachGuard.
 *
 * Chaque écran est chargé à la demande (loadComponent) : le navigateur ne
 * télécharge au démarrage que le socle de l'application, puis le code d'une
 * page (et ses dépendances, comme Chart.js pour les statistiques) la première
 * fois qu'on l'ouvre.
 *
 * Les écrans de connexion, de mot de passe oublié et de réinitialisation sont publics.
 *
 * Le titre de chaque route devient le titre de l'onglet (« Séances · SportPlan »,
 * voir SportPlanTitleStrategy), utile pour l'historique et les lecteurs d'écran.
 */
import { Routes } from '@angular/router';
import { authGuard, coachGuard, adminGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', title: 'Connexion', loadComponent: () => import('@features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'forgot-password', title: 'Mot de passe oublié', loadComponent: () => import('@features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent) },
  { path: 'reset-password', title: 'Nouveau mot de passe', loadComponent: () => import('@features/auth/reset-password.component').then((m) => m.ResetPasswordComponent) },
  { path: 'dashboard', title: 'Tableau de bord', loadComponent: () => import('@features/dashboard/dashboard.component').then((m) => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'sessions', title: 'Séances', loadComponent: () => import('@features/sessions/sessions.component').then((m) => m.SessionsComponent), canActivate: [authGuard] },
  { path: 'workouts/new', title: 'Créer une séance', loadComponent: () => import('@features/workout-create/workout-create.component').then((m) => m.WorkoutCreateComponent), canActivate: [coachGuard] },
  { path: 'calendar', title: 'Calendrier', loadComponent: () => import('@features/calendar/calendar.component').then((m) => m.CalendarComponent), canActivate: [authGuard] },
  { path: 'participations', title: 'Participations', loadComponent: () => import('@features/participations/participations.component').then((m) => m.ParticipationsComponent), canActivate: [authGuard] },
  { path: 'performances', title: 'Statistiques', loadComponent: () => import('@features/performances/performances.component').then((m) => m.PerformancesComponent), canActivate: [authGuard] },
  { path: 'profile', title: 'Profil', loadComponent: () => import('@features/profile/profile.component').then((m) => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'goals', title: 'Objectifs et records', loadComponent: () => import('@features/goals/goals.component').then((m) => m.GoalsComponent), canActivate: [authGuard] },
  { path: 'programs', title: 'Programmes', loadComponent: () => import('@features/programs/programs.component').then((m) => m.ProgramsComponent), canActivate: [authGuard] },
  { path: 'notifications', title: 'Notifications', loadComponent: () => import('@features/notifications/notifications.component').then((m) => m.NotificationsComponent), canActivate: [authGuard] },
  { path: 'athletes', title: 'Mes sportifs', loadComponent: () => import('@features/athletes/athletes.component').then((m) => m.AthletesComponent), canActivate: [coachGuard] },
  { path: 'athletes/:id', title: 'Suivi individuel', loadComponent: () => import('@features/athletes/athlete-detail.component').then((m) => m.AthleteDetailComponent), canActivate: [coachGuard] },
  { path: 'journal', title: 'Journal d’entraînement', loadComponent: () => import('@features/journal/journal.component').then((m) => m.JournalComponent), canActivate: [authGuard] },
  { path: 'admin/users', title: 'Gestion des comptes', loadComponent: () => import('@features/admin/admin-users.component').then((m) => m.AdminUsersComponent), canActivate: [adminGuard] },
  { path: 'admin/audit', title: 'Journal d’activité', loadComponent: () => import('@features/admin/audit-log.component').then((m) => m.AuditLogComponent), canActivate: [adminGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' }
];
