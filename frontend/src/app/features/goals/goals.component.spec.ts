import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GoalsComponent } from './goals.component';
import { Goal, GoalService } from './goal.service';

const goal = (id: number, current: number, target: number, unit = 'séances', extra: Partial<Goal> = {}): Goal =>
  ({ id, user_id: 1, title: `Objectif ${id}`, metric: 'séances', target_value: target, current_value: current, unit, ...extra });

function setup(goals: Goal[]): GoalsComponent {
  TestBed.configureTestingModule({
    providers: [{ provide: GoalService, useValue: { goals: () => of(goals), records: () => of([]) } }]
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

  it('counts automatic session goals from the first day of their creation month', () => {
    const component = setup([]);

    const start = component.goalMonth(goal(1, 5, 12, 'séances', { auto_progress: true, created_at: '2026-09-27T10:00:00Z' }));

    expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([2026, 8, 1]);
  });

  it('caps the progress at 100 % once the goal is exceeded', () => {
    const component = setup([]);

    expect(component.progress(goal(1, 15, 12))).toBe(100);
    expect(component.isReached(goal(1, 15, 12))).toBe(true);
  });
});
