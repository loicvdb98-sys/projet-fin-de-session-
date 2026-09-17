import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../services/auth.service';
import { StatisticsService } from '../services/statistics.service';
import { UserService } from '../services/user.service';
import { SessionService } from '../services/session.service';
import { PerformanceService } from '../services/performance.service';
import { NotificationService } from '../services/notification.service';
import { GoalService } from '../services/goal.service';
import { ParticipationService } from '../services/participation.service';
import { ProgramService } from '../services/program.service';
import { JournalService } from '../services/journal.service';

function setup(isCoachOrAdmin = false): DashboardComponent {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { isCoachOrAdmin: () => isCoachOrAdmin } },
      { provide: StatisticsService, useValue: { mine: () => of({ total_sessions: 0, upcoming_sessions: 2, total_participations: 5, attended_sessions: 4, total_performances: 8, average_score: 75 }) } },
      { provide: UserService, useValue: { me: () => of({ id: 1, email: 'a@a.com', full_name: 'Alex Martin', role: 'sportif', is_active: true }), athletes: () => of([]) } },
      { provide: SessionService, useValue: { list: () => of([]) } },
      { provide: PerformanceService, useValue: { list: () => of([]) } },
      { provide: NotificationService, useValue: { list: () => of([]) } },
      { provide: GoalService, useValue: { goals: () => of([]) } },
      { provide: ParticipationService, useValue: { list: () => of([]) } },
      { provide: ProgramService, useValue: { list: () => of([]) } },
      { provide: JournalService, useValue: { list: () => of([]) } },
    ]
  });
  return TestBed.createComponent(DashboardComponent).componentInstance;
}

describe('DashboardComponent', () => {
  it('shows only the base modules for a non-coach account', () => {
    const component = setup(false);

    expect(component.modules.some((module) => module.key === 'athletes')).toBe(false);
    expect(component.modules.some((module) => module.key === 'sessions')).toBe(true);
  });

  it('adds the coaching modules for a coach or admin account', () => {
    const component = setup(true);

    expect(component.modules.some((module) => module.key === 'athletes')).toBe(true);
    expect(component.modules.some((module) => module.key === 'workout-new')).toBe(true);
  });

  it('defaults the selected module to sessions and switches on demand', () => {
    const component = setup();

    expect(component.selectedModule?.key).toBe('sessions');

    component.selectModule('goals');

    expect(component.selectedKey).toBe('goals');
    expect(component.selectedModule?.key).toBe('goals');
  });

  it('extracts a first name, falling back to the full string when there is no space', () => {
    const component = setup();

    expect(component.firstName('Alex Martin')).toBe('Alex');
    expect(component.firstName('Cher')).toBe('Cher');
  });

  it('averages performance scores', () => {
    const component = setup();

    expect(component.avgScore([{ score: 80 }, { score: 90 }, { score: 70 }])).toBe(80);
  });

  it('computes a goal completion percentage, capped at 100', () => {
    const component = setup();

    expect(component.goalProgress({ current_value: 5, target_value: 10 })).toBe(50);
    expect(component.goalProgress({ current_value: 15, target_value: 10 })).toBe(100);
    expect(component.goalProgress({ current_value: 5, target_value: 0 })).toBe(0);
  });

  it('falls back to a capitalized raw status when there is no French label', () => {
    const component = setup();

    expect(component.statusLabel('inscrit')).toBe('Inscrit');
  });

  it('keeps only the last 6 scores and clamps bar heights between 8 and 100', () => {
    const component = setup();
    const items = [10, 200, -5, 50, 60, 70, 80, 90].map((score) => ({ score }));

    const bars = component.sparkBars(items);

    expect(bars.length).toBe(6);
    expect(Math.max(...bars)).toBeLessThanOrEqual(100);
    expect(Math.min(...bars)).toBeGreaterThanOrEqual(8);
  });
});
