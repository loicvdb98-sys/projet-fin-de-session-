/**
 * Semaine du coach (tableau de bord) : ses séances du lundi au dimanche, leur remplissage et
 * les présences qui restent à pointer une fois la séance commencée. Un admin voit toutes les
 * séances de la semaine.
 */
import { Participation } from '@features/participations/participation.service';
import { SportSession } from '@features/sessions/session.service';

export interface WeekRow {
  session: SportSession;
  /** Taux de remplissage (%). */
  fill: number;
  /** Inscrits encore « inscrit » d'une séance déjà commencée. */
  toMark: number;
}

export interface WeekOverview {
  rows: WeekRow[];
  /** Remplissage moyen des séances de la semaine (%), 0 sans séance. */
  fill: number;
  /** Total des présences à pointer. */
  toMark: number;
}

/** Lundi 00:00 (heure locale) de la semaine contenant `now`. */
export function startOfWeek(now: Date): Date {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

export function weekOverview(sessions: SportSession[], participations: Participation[], userId: number, isAdmin: boolean, now: Date = new Date()): WeekOverview {
  const start = startOfWeek(now).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  const rows = sessions
    .filter((session) => {
      const time = new Date(session.starts_at).getTime();
      return time >= start && time < end && (isAdmin || session.coach_id === userId);
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((session): WeekRow => ({
      session,
      fill: session.capacity ? Math.min(100, Math.round((session.registered_count / session.capacity) * 100)) : 0,
      toMark: new Date(session.starts_at).getTime() <= now.getTime()
        ? participations.filter((item) => item.session_id === session.id && item.status === 'inscrit').length
        : 0,
    }));
  return {
    rows,
    fill: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.fill, 0) / rows.length) : 0,
    toMark: rows.reduce((sum, row) => sum + row.toMark, 0),
  };
}
