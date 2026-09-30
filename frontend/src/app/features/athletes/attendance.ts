/**
 * Calcul de l'assiduité d'un sportif, partagé par la liste des sportifs et leur
 * fiche de suivi. Seules les séances déjà passées comptent : une inscription à une
 * séance à venir n'est ni une présence ni une absence.
 */
import { Participation } from '@features/participations/participation.service';
import { SportSession } from '@features/sessions/session.service';

export interface AttendanceSummary {
  /** Nombre total d'inscriptions (passées et à venir). */
  registrations: number;
  /** Séances passées auxquelles le sportif était inscrit. */
  pastSessions: number;
  /** Séances passées où il a été marqué présent. */
  attended: number;
  /** Inscriptions à des séances à venir. */
  upcoming: number;
  /** Taux de présence (%) sur les séances passées, 0 s'il n'y en a pas. */
  rate: number;
  /** Date de la dernière séance passée où il était présent, ou null. */
  lastActivity: Date | null;
}

export function summarizeAttendance(
  athleteId: number,
  participations: Participation[],
  sessions: SportSession[],
  now: Date = new Date()
): AttendanceSummary {
  const startsAt = new Map(sessions.map((session) => [session.id, new Date(session.starts_at)]));
  const own = participations.filter((participation) => participation.user_id === athleteId);
  const past = own.filter((participation) => {
    const date = startsAt.get(participation.session_id);
    return date !== undefined && date <= now;
  });
  const present = past.filter((participation) => participation.status === 'present');
  const lastPresent = present
    .map((participation) => startsAt.get(participation.session_id)!)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return {
    registrations: own.length,
    pastSessions: past.length,
    attended: present.length,
    upcoming: own.filter((participation) => (startsAt.get(participation.session_id) ?? now) > now).length,
    rate: past.length ? Math.round((present.length / past.length) * 100) : 0,
    lastActivity: lastPresent,
  };
}

/** Raison pour laquelle un coach devrait relancer un sportif. */
export type AttendanceAlertReason = 'absences' | 'low-rate' | 'inactive' | 'no-registration';

export interface AttendanceAlert {
  reason: AttendanceAlertReason;
  /** Phrase courte affichée au coach (ex. « Absent aux 2 dernières séances »). */
  message: string;
}

/** En dessous de ce taux (%), sur au moins LOW_RATE_MIN_SESSIONS séances passées, la présence est jugée faible. */
export const LOW_RATE = 50;
const LOW_RATE_MIN_SESSIONS = 3;
/** Sans présence depuis ce nombre de jours (et sans séance à venir), le sportif est jugé inactif. */
export const INACTIVE_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Indique si un sportif est à relancer, avec la raison la plus importante : absent aux deux
 * dernières séances passées, présence inférieure à 50 % sur au moins trois séances, aucune
 * présence depuis 21 jours sans séance à venir, ou aucune inscription. `null` si tout va bien.
 */
export function attendanceAlert(
  athleteId: number,
  participations: Participation[],
  sessions: SportSession[],
  now: Date = new Date()
): AttendanceAlert | null {
  const startsAt = new Map(sessions.map((session) => [session.id, new Date(session.starts_at)]));
  const own = participations.filter((participation) => participation.user_id === athleteId);
  if (!own.length) return { reason: 'no-registration', message: 'Aucune inscription pour le moment' };
  const [last, previous] = own
    .filter((participation) => { const date = startsAt.get(participation.session_id); return date !== undefined && date <= now; })
    .sort((a, b) => startsAt.get(b.session_id)!.getTime() - startsAt.get(a.session_id)!.getTime());
  if (last?.status === 'absent' && previous?.status === 'absent') return { reason: 'absences', message: 'Absent aux 2 dernières séances' };
  const summary = summarizeAttendance(athleteId, participations, sessions, now);
  if (summary.pastSessions >= LOW_RATE_MIN_SESSIONS && summary.rate < LOW_RATE) {
    return { reason: 'low-rate', message: `Présence de ${summary.rate} % seulement` };
  }
  if (!summary.upcoming && (!summary.lastActivity || now.getTime() - summary.lastActivity.getTime() > INACTIVE_DAYS * DAY_MS)) {
    return {
      reason: 'inactive',
      message: summary.lastActivity
        ? `Aucune présence depuis le ${summary.lastActivity.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}, aucune séance à venir`
        : 'Aucune présence et aucune séance à venir',
    };
  }
  return null;
}
