import { summarizeAttendance } from './attendance';
import { SportSession } from '@features/sessions/session.service';

const NOW = new Date('2026-09-29T12:00:00Z');
const session = (id: number, iso: string) =>
  ({ id, starts_at: iso, title: `S${id}`, coach_id: 2, coach_name: 'Coach', duration_minutes: 60, capacity: 10, registered_count: 1 } as SportSession);
const sessions = [
  session(1, '2026-09-10T10:00:00Z'),
  session(2, '2026-09-20T10:00:00Z'),
  session(3, '2026-09-25T10:00:00Z'),
  session(4, '2026-10-02T10:00:00Z'),
];

describe('summarizeAttendance', () => {
  it('counts attendance on past sessions only, not upcoming registrations', () => {
    const summary = summarizeAttendance(7, [
      { id: 1, user_id: 7, session_id: 1, status: 'present' },
      { id: 2, user_id: 7, session_id: 2, status: 'present' },
      { id: 3, user_id: 7, session_id: 4, status: 'inscrit' },
      { id: 4, user_id: 99, session_id: 3, status: 'absent' },
    ], sessions, NOW);

    expect(summary).toMatchObject({ registrations: 3, pastSessions: 2, attended: 2, upcoming: 1, rate: 100 });
  });

  it('uses the last past session where the athlete was present as last activity', () => {
    const summary = summarizeAttendance(7, [
      { id: 1, user_id: 7, session_id: 2, status: 'present' },
      { id: 2, user_id: 7, session_id: 3, status: 'absent' },
      { id: 3, user_id: 7, session_id: 4, status: 'inscrit' },
    ], sessions, NOW);

    expect(summary.lastActivity?.toISOString()).toBe('2026-09-20T10:00:00.000Z');
    expect(summary.rate).toBe(50);
  });

  it('returns an empty summary without any registration', () => {
    expect(summarizeAttendance(7, [], sessions, NOW)).toEqual({ registrations: 0, pastSessions: 0, attended: 0, upcoming: 0, rate: 0, lastActivity: null });
  });
});
