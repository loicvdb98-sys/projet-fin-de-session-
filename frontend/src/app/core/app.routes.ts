/**
 * Table de routage de l'application : associe chaque URL à son composant
 * de fonctionnalité et protège les écrans sensibles via authGuard/coachGuard.
 *
 * Chaque écran est chargé à la demande (loadComponent) : le navigateur ne
 * télécharge au démarrage que le socle de l'application, puis le code d'une
 * page (et ses dépendances, comme Chart.js pour les statistiques) la première
 * fois qu'on l'ouvre.
 */
import { Routes } from '@angular/router';
import { authGuard, coachGuard, adminGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('@features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'dashboard', loadComponent: () => import('@features/dashboard/dashboard.component').then((m) => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'sessions', loadComponent: () => import('@features/sessions/sessions.component').then((m) => m.SessionsComponent), canActivate: [authGuard] },
  { path: 'workouts/new', loadComponent: () => import('@features/workout-create/workout-create.component').then((m) => m.WorkoutCreateComponent), canActivate: [coachGuard] },
  { path: 'calendar', loadComponent: () => import('@features/calendar/calendar.component').then((m) => m.CalendarComponent), canActivate: [authGuard] },
  { path: 'participations', loadComponent: () => import('@features/participations/participations.component').then((m) => m.ParticipationsComponent), canActivate: [authGuard] },
  { path: 'performances', loadComponent: () => import('@features/performances/performances.component').then((m) => m.PerformancesComponent), canActivate: [authGuard] },
  { path: 'profile', loadComponent: () => import('@features/profile/profile.component').then((m) => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'goals', loadComponent: () => import('@features/goals/goals.component').then((m) => m.GoalsComponent), canActivate: [authGuard] },
  { path: 'programs', loadComponent: () => import('@features/programs/programs.component').then((m) => m.ProgramsComponent), canActivate: [authGuard] },
  { path: 'notifications', loadComponent: () => import('@features/notifications/notifications.component').then((m) => m.NotificationsComponent), canActivate: [authGuard] },
  { path: 'athletes', loadComponent: () => import('@features/athletes/athletes.component').then((m) => m.AthletesComponent), canActivate: [coachGuard] },
  { path: 'athletes/:id', loadComponent: () => import('@features/athletes/athlete-detail.component').then((m) => m.AthleteDetailComponent), canActivate: [coachGuard] },
  { path: 'journal', loadComponent: () => import('@features/journal/journal.component').then((m) => m.JournalComponent), canActivate: [authGuard] },
  { path: 'admin/users', loadComponent: () => import('@features/admin/admin-users.component').then((m) => m.AdminUsersComponent), canActivate: [adminGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' }
];
