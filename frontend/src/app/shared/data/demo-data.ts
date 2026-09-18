/**
 * ================================================================
 * DONNÉES DE DÉMONSTRATION — À SUPPRIMER APRÈS LA PRÉSENTATION
 * ================================================================
 *
 * Ces données sont uniquement locales : elles ne sont jamais envoyées
 * à la base de données. Pour les masquer immédiatement, remplacez
 * `true` par `false` ci-dessous. Le reste de l'application utilisera
 * alors l'API normalement.
 */
export const DEMO_MODE = false;

export const DEMO_STATISTICS = {
  total_sessions: 18,
  upcoming_sessions: 3,
  total_participations: 16,
  attended_sessions: 14,
  total_performances: 8,
  average_score: 82.4,
};

export const DEMO_PERFORMANCES = [
  { id: 101, user_id: 1, session_id: 12, score: 68, notes: 'Reprise après une semaine de récupération', recorded_at: '2026-08-05T18:00:00' },
  { id: 102, user_id: 1, session_id: 14, score: 74, notes: 'Bonne endurance sur la séance cardio', recorded_at: '2026-08-12T18:00:00' },
  { id: 103, user_id: 1, session_id: 16, score: 81, notes: 'Objectif hebdomadaire atteint', recorded_at: '2026-08-19T18:00:00' },
  { id: 104, user_id: 1, session_id: 18, score: 88, notes: 'Nouveau record personnel', recorded_at: '2026-08-26T18:00:00' },
  { id: 105, user_id: 1, session_id: 20, score: 92, notes: 'Très bonne régularité', recorded_at: '2026-09-02T18:00:00' },
];

export const DEMO_GOALS = [
  { id: 201, user_id: 1, title: 'Terminer 12 séances ce mois-ci', metric: 'séances', target_value: 12, current_value: 9, unit: 'séances', due_date: '2026-09-30', notes: 'Rester régulier chaque semaine' },
  { id: 202, user_id: 1, title: 'Améliorer mon endurance', metric: 'score', target_value: 100, current_value: 82, unit: 'points', due_date: '2026-10-15', notes: 'Suivi avec les performances cardio' },
];

export const DEMO_RECORDS = [
  { id: 301, user_id: 1, exercise_name: 'Développé couché', value: 85, unit: 'kg', achieved_at: '2026-09-02T18:00:00', notes: 'Nouvelle meilleure charge' },
  { id: 302, user_id: 1, exercise_name: 'Course 5 km', value: 24.8, unit: 'min', achieved_at: '2026-08-26T18:00:00', notes: 'Allure régulière' },
  { id: 303, user_id: 1, exercise_name: 'Squat', value: 105, unit: 'kg', achieved_at: '2026-08-19T18:00:00', notes: 'Objectif dépassé' },
];

export const DEMO_ATHLETES = [
  { id: 401, email: 'lea.martin@sportplan.demo', full_name: 'Léa Martin', role: 'athlete', is_active: true, specialty: 'Course à pied', weekly_sessions: 3, progress: 82, goal: '5 km en moins de 25 min', last_activity: 'Aujourd’hui à 18:00' },
  { id: 402, email: 'thomas.dupont@sportplan.demo', full_name: 'Thomas Dupont', role: 'athlete', is_active: true, specialty: 'Renforcement musculaire', weekly_sessions: 4, progress: 68, goal: 'Développé couché : 90 kg', last_activity: 'Hier à 19:30' },
  { id: 403, email: 'ines.bernard@sportplan.demo', full_name: 'Inès Bernard', role: 'athlete', is_active: true, specialty: 'Fitness & mobilité', weekly_sessions: 2, progress: 91, goal: '12 séances ce mois-ci', last_activity: 'Il y a 2 jours' },
];

/** Profil affiché dans l'espace Coach pendant la démonstration. */
export const DEMO_COACH = {
  id: 400,
  email: 'melissa.coach@sportplan.demo',
  full_name: 'Melissa Coach',
  role: 'coach',
  is_active: true,
};
