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

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'sessions', component: SessionsComponent },
  { path: 'workouts/new', component: WorkoutCreateComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: 'participations', component: ParticipationsComponent },
  { path: 'performances', component: PerformancesComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'goals', component: GoalsComponent },
  { path: 'programs', component: ProgramsComponent },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' }
];
