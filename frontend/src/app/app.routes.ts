import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login.component';
import { DashboardComponent } from './pages/dashboard.component';
import { SessionsComponent } from './pages/sessions.component';
import { ProfileComponent } from './pages/profile.component';
import { CalendarComponent } from './pages/calendar.component';
import { ParticipationsComponent } from './pages/participations.component';
import { PerformancesComponent } from './pages/performances.component';
import { WorkoutCreateComponent } from './pages/workout-create.component';
import { GoalsComponent } from './pages/goals.component';
import { ProgramsComponent } from './pages/programs.component';
import { NotificationsComponent } from './pages/notifications.component';
import { AthletesComponent } from './pages/athletes.component';
import { JournalComponent } from './pages/journal.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'sessions', component: SessionsComponent },
  { path: 'workouts/new', component: WorkoutCreateComponent, canActivate: [authGuard] },
  { path: 'calendar', component: CalendarComponent },
  { path: 'participations', component: ParticipationsComponent, canActivate: [authGuard] },
  { path: 'performances', component: PerformancesComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'goals', component: GoalsComponent, canActivate: [authGuard] },
  { path: 'programs', component: ProgramsComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [authGuard] },
  { path: 'athletes', component: AthletesComponent, canActivate: [authGuard] },
  { path: 'journal', component: JournalComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' }
];
