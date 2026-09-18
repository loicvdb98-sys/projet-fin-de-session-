import { Routes } from '@angular/router';
import { LoginComponent } from '@features/auth/login.component';
import { DashboardComponent } from '@features/dashboard/dashboard.component';
import { SessionsComponent } from '@features/sessions/sessions.component';
import { ProfileComponent } from '@features/profile/profile.component';
import { CalendarComponent } from '@features/calendar/calendar.component';
import { ParticipationsComponent } from '@features/participations/participations.component';
import { PerformancesComponent } from '@features/performances/performances.component';
import { WorkoutCreateComponent } from '@features/workout-create/workout-create.component';
import { GoalsComponent } from '@features/goals/goals.component';
import { ProgramsComponent } from '@features/programs/programs.component';
import { NotificationsComponent } from '@features/notifications/notifications.component';
import { AthletesComponent } from '@features/athletes/athletes.component';
import { AthleteDetailComponent } from '@features/athletes/athlete-detail.component';
import { JournalComponent } from '@features/journal/journal.component';
import { authGuard, coachGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'sessions', component: SessionsComponent, canActivate: [authGuard] },
  { path: 'workouts/new', component: WorkoutCreateComponent, canActivate: [coachGuard] },
  { path: 'calendar', component: CalendarComponent, canActivate: [authGuard] },
  { path: 'participations', component: ParticipationsComponent, canActivate: [authGuard] },
  { path: 'performances', component: PerformancesComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'goals', component: GoalsComponent, canActivate: [authGuard] },
  { path: 'programs', component: ProgramsComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [authGuard] },
  { path: 'athletes', component: AthletesComponent, canActivate: [coachGuard] },
  { path: 'athletes/:id', component: AthleteDetailComponent, canActivate: [coachGuard] },
  { path: 'journal', component: JournalComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' }
];
