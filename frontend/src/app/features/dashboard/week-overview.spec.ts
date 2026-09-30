import { startOfWeek, weekOverview } from './week-overview';
import { SportSession } from '@features/sessions/session.service';

// Mercredi 30 septembre 2026, 12:00 (heure locale).
const NOW = new Date(2026, 8, 30, 12, 0);
const session = (id: number, day: number, hour: number, coach = 2, registered = 5, capacity = 10): SportSession => ({
  id, title: `S${id}`, starts_at: new Date(2026, 8, day, hour, 0).toISOString(), coach_id: coach, coach_name: 'Coach',
  duration_minutes: 60, capacity, registered_count: registered,
});

describe('weekOverview', () => {
  const sessions = [
    session(1, 28, 18),            // lundi, passée
    session(2, 30, 18, 2, 10, 10), // mercredi soir, complète
    session(3, 4, 10),             // dimanche 4 octobre : hors semaine (octobre = mois 9)
    session(4, 27, 18),            // dimanche précédent : hors semaine
    session(5, 29, 18, 7),         // autre coach
  ];
  sessions[2] = { ...sessions[2], starts_at: new Date(2026, 9, 5, 10, 0).toISOString() };

  it('starts the week on Monday at midnight', () => {
    expect(startOfWeek(NOW)).toEqual(new Date(2026, 8, 28, 0, 0));
  });

  it("lists the coach's sessions of the week with their fill rate and attendance left to mark", () => {
    const week = weekOverview(sessions, [
      { id: 1, user_id: 10, session_id: 1, status: 'inscrit' },
      { id: 2, user_id: 11, session_id: 1, status: 'present' },
      { id: 3, user_id: 10, session_id: 2, status: 'inscrit' },
    ], 2, false, NOW);

    expect(week.rows.map((row) => row.session.id)).toEqual([1, 2]);
    expect(week.rows.map((row) => row.fill)).toEqual([50, 100]);
    // La séance de mercredi soir n'a pas encore commencé : rien à pointer.
    expect(week.rows.map((row) => row.toMark)).toEqual([1, 0]);
    expect([week.fill, week.toMark]).toEqual([75, 1]);
  });

  it('shows every session of the week to an admin', () => {
    expect(weekOverview(sessions, [], 1, true, NOW).rows.map((row) => row.session.id)).toEqual([1, 5, 2]);
  });
});
