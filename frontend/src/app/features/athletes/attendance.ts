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
