import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SessionsComponent } from './sessions.component';
import { SessionService, SportSession } from './session.service';
import { UserService } from '@features/athletes/user.service';
import { Participation, ParticipationService } from '@features/participations/participation.service';

const DAY = 24 * 60 * 60 * 1000;

function session(id: number, daysFromNow: number): SportSession {
  return {
    id, title: `Séance ${id}`, starts_at: new Date(Date.now() + daysFromNow * DAY).toISOString(),
    coach_id: 2, coach_name: 'Camille Coach', duration_minutes: 60, capacity: 10, registered_count: 3
  };
}

function setup(sessions: SportSession[], participations: Participation[] = [], extra: Partial<SessionService> = {}): SessionsComponent {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: SessionService, useValue: { list: () => of(sessions), ...extra } },
      { provide: UserService, useValue: { me: () => of({ id: 1, email: 'a@a.com', full_name: 'Alex Sportif', role: 'sportif', is_active: true }) } },
      { provide: ParticipationService, useValue: { list: () => of(participations) } },
    ]
  });
  return TestBed.createComponent(SessionsComponent).componentInstance;
}

describe('SessionsComponent', () => {
  it('separates upcoming sessions (closest first) from past ones (most recent first)', () => {
    const component = setup([session(1, -10), session(2, 5), session(3, -2), session(4, 1)]);

    expect(component.upcomingSessions().map((item) => item.id)).toEqual([4, 2]);
    expect(component.pastSessions().map((item) => item.id)).toEqual([3, 1]);
  });

  it('opens on the next upcoming session, never on a past one', () => {
    const component = setup([session(1, -10), session(2, 5), session(4, 1)]);

    expect(component.selectedModuleSession?.id).toBe(4);
    expect(component.isNextSession(component.selectedModuleSession!)).toBe(true);
  });

  it('falls back to the most recent past session when nothing is upcoming', () => {
    const component = setup([session(1, -10), session(3, -2)]);

    expect(component.selectedModuleSession?.id).toBe(3);
    expect(component.isPast(component.selectedModuleSession!)).toBe(true);
    expect(component.sessionTint(component.selectedModuleSession!)).toBe('secondary');
  });

  it("knows the user's own registrations only", () => {
    const component = setup([session(1, 2), session(2, 3)], [
      { id: 7, user_id: 1, session_id: 1, status: 'inscrit' },
      { id: 8, user_id: 99, session_id: 2, status: 'inscrit' },
    ]);

    expect(component.myParticipation(session(1, 2))?.id).toBe(7);
    expect(component.myParticipation(session(2, 3))).toBeUndefined();
    expect(component.statusLabel('present')).toBe('Présent');
  });

  it('exports only the upcoming sessions where the user is expected', () => {
    const component = setup([session(1, 2), session(2, 3), session(3, -2), session(4, 4)], [
      { id: 7, user_id: 1, session_id: 1, status: 'inscrit' },
      { id: 8, user_id: 1, session_id: 2, status: 'absent' },
      { id: 9, user_id: 1, session_id: 3, status: 'present' },
    ]);

    expect(component.myUpcomingSessions().map((item) => item.id)).toEqual([1]);
  });

  it('shows the duplicated session right away', () => {
    const copy = session(9, 8);
    const component = setup([session(1, 1)], [], { duplicate: () => of(copy) });

    component.duplicate(session(1, 1));

    expect(component.sessions.map((item) => item.id)).toContain(9);
    expect(component.selectedModuleSession?.id).toBe(9);
  });

  describe('search and filters', () => {
    const catalog = (): SportSession[] => [
      { ...session(1, 1), title: 'Yoga & récupération', coach_name: 'Camille Coach' },
      { ...session(2, 3), title: 'Circuit force', coach_name: 'Léo Durand', registered_count: 10 },
      { ...session(3, 12), title: 'Préparation trail', coach_name: 'Camille Coach' },
      { ...session(4, -2), title: 'HIIT express', coach_name: 'Léo Durand' },
    ];

    it('finds sessions by title or coach, ignoring accents and case', () => {
      const component = setup(catalog());

      component.searchTerm = 'RECUPERATION';
      expect(component.upcomingSessions().map((item) => item.id)).toEqual([1]);

      component.searchTerm = 'leo';
      expect([...component.upcomingSessions(), ...component.pastSessions()].map((item) => item.id)).toEqual([2, 4]);
    });

    it('keeps only upcoming sessions with free spots, or those of the next 7 days', () => {
      const component = setup(catalog());

      component.filter = 'available';
      expect(component.visibleCount()).toBe(2);
      expect(component.upcomingSessions().map((item) => item.id)).toEqual([1, 3]);

      component.filter = 'week';
      expect(component.upcomingSessions().map((item) => item.id)).toEqual([1, 2]);
    });

    it('keeps only my registrations with the « mine » filter', () => {
      const component = setup(catalog(), [{ id: 7, user_id: 1, session_id: 3, status: 'inscrit' }]);

      component.filter = 'mine';

      expect(component.visibleCount()).toBe(1);
      expect(component.selectedModuleSession?.id).toBe(3);
    });

    it('does not let filters hide the real next session or shrink the calendar export', () => {
      const component = setup(catalog(), [{ id: 7, user_id: 1, session_id: 1, status: 'inscrit' }]);

      component.searchTerm = 'trail';

      expect(component.isNextSession(catalog()[0])).toBe(true);
      expect(component.myUpcomingSessions().map((item) => item.id)).toEqual([1]);
      component.resetFilters();
      expect(component.visibleCount()).toBe(4);
    });
  });
});
