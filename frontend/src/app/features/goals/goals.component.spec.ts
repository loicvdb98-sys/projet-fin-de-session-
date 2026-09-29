import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GoalsComponent } from './goals.component';
import { Goal, GoalService } from './goal.service';
import { UserService } from '@features/athletes/user.service';
import { ParticipationService } from '@features/participations/participation.service';
import { SessionService } from '@features/sessions/session.service';

const DAY = 24 * 60 * 60 * 1000;
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
// Séances déjà passées : une ce mois-ci, une le mois précédent.
const sessions = [
  { id: 10, starts_at: new Date(Math.max(monthStart, Date.now() - DAY)).toISOString() },
  { id: 11, starts_at: new Date(monthStart - 5 * DAY).toISOString() },
];
const goal = (id: number, current: number, target: number, unit = 'séances'): Goal =>
  ({ id, user_id: 1, title: `Objectif ${id}`, metric: 'séances', target_value: target, current_value: current, unit });

function setup(goals: Goal[]): GoalsComponent {
  TestBed.configureTestingModule({
    providers: [
      { provide: GoalService, useValue: { goals: () => of(goals), records: () => of([]) } },
      { provide: UserService, useValue: { me: () => of({ id: 1, email: 'a@a.com', full_name: 'Alex Sportif', role: 'sportif', is_active: true }) } },
      { provide: SessionService, useValue: { list: () => of(sessions) } },
      {
        provide: ParticipationService, useValue: {
          list: () => of([
            { id: 1, user_id: 1, session_id: 10, status: 'present' },
            { id: 2, user_id: 1, session_id: 11, status: 'present' },
            { id: 3, user_id: 2, session_id: 10, status: 'present' },
          ])
        }
      },
    ]
  });
  return TestBed.createComponent(GoalsComponent).componentInstance;
}

describe('GoalsComponent', () => {
  it('opens the first goal and computes its progress', () => {
    const component = setup([goal(1, 9, 12), goal(2, 12, 12)]);

    expect(component.selectedGoal?.id).toBe(1);
    expect(component.progress(component.goals[0])).toBe(75);
    expect(component.reachedCount).toBe(1);
  });

  it('counts only the current user sessions attended since the 1st of the month', () => {
    const component = setup([goal(1, 0, 12)]);

    expect(component.attendedThisMonth).toBe(1);
  });

  it('suggests the attendance only for goals counted in sessions', () => {
    const component = setup([]);

    expect(component.isSessionGoal(goal(1, 0, 12, 'séances'))).toBe(true);
    expect(component.isSessionGoal(goal(2, 0, 100, 'points'))).toBe(false);
  });
});
