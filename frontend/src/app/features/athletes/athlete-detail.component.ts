/**
 * Fiche de suivi individuel d'un sportif : assiduité et tendance de performance,
 * calculées à partir de ses participations et performances réelles (visibles par
 * le coach car limitées aux séances qu'il encadre).
 */
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { User, UserService } from './user.service';
import { ParticipationService } from '@features/participations/participation.service';
import { PerformanceService } from '@features/performances/performance.service';
import { SessionService } from '@features/sessions/session.service';

@Component({
  standalone: true,
  imports: [MatButtonModule, MatCardModule, RouterLink],
  template: `
    <section class="page">
      @if (!loaded) {
        <p class="text-secondary">Chargement du suivi…</p>
      } @else if (athlete) {
        <a mat-button class="teal-action back-link" routerLink="/athletes">← Retour aux sportifs</a>
        <div class="page-heading athlete-detail-heading">
          <div class="profile-avatar" aria-hidden="true">{{ initials(athlete.full_name) }}</div>
          <div><p class="eyebrow">SUIVI INDIVIDUEL</p><h1>{{ athlete.full_name }}</h1><p class="text-secondary">{{ athlete.email }}</p></div>
          <span class="status-badge" [class]="athlete.is_active ? 'success' : 'danger'">{{ athlete.is_active ? 'Actif' : 'Désactivé' }}</span>
        </div>

        <div class="cards athlete-overview">
          <mat-card class="stat-card accent"><mat-card-title>Taux de présence</mat-card-title><strong class="stat-value">{{ attendanceRate }} %</strong><p class="text-secondary">sur {{ totalSessions }} séance(s) suivie(s)</p></mat-card>
          <mat-card class="stat-card"><mat-card-title>Séances présent(e)</mat-card-title><strong class="stat-value">{{ sessionsAttended }}</strong><p class="text-secondary">sur {{ totalSessions }} inscription(s)</p></mat-card>
          <mat-card class="stat-card"><mat-card-title>Dernière activité</mat-card-title><strong class="activity-value">{{ lastActivity || '—' }}</strong><p class="text-secondary">sportif suivi</p></mat-card>
        </div>

        <div class="athlete-followup-grid">
          <mat-card>
            <p class="eyebrow">ASSIDUITÉ</p><h2>Présence aux séances</h2>
            <div class="goal-progress large-progress"><span [style.width.%]="attendanceRate"></span></div>
            <p class="text-secondary">{{ sessionsAttended }} présence(s) sur {{ totalSessions }} séance(s) suivie(s).</p>
          </mat-card>
          @if (performanceScores.length) {
            <mat-card>
              <p class="eyebrow">ÉVOLUTION RÉCENTE</p><h2>Progression sur {{ performanceScores.length }} performance(s)</h2>
              <div class="mini-chart">@for (score of sparkBars; track $index) { <div><span [style.height.%]="score"></span><small>{{ $index + 1 }}</small></div> }</div>
              <p class="text-secondary">{{ trendLabel }}</p>
            </mat-card>
          } @else {
            <mat-card><p class="eyebrow">ÉVOLUTION RÉCENTE</p><h2>Pas encore de performance</h2><p class="text-secondary">Aucune performance n'a encore été enregistrée pour ce sportif.</p></mat-card>
          }
        </div>
      } @else {
        <mat-card class="empty-state-card"><h2>Sportif introuvable</h2><a mat-stroked-button routerLink="/athletes">Retour aux sportifs</a></mat-card>
      }
    </section>
  `
})
/** Détail d'un sportif identifié par l'id dans l'URL : assiduité et tendance de performance réelles. */
export class AthleteDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly users = inject(UserService);
  private readonly participationService = inject(ParticipationService);
  private readonly performanceService = inject(PerformanceService);
  private readonly sessionService = inject(SessionService);

  loaded = false;
  athlete?: User;
  attendanceRate = 0;
  sessionsAttended = 0;
  totalSessions = 0;
  lastActivity: string | null = null;
  performanceScores: number[] = [];

  constructor() {
    const athleteId = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin([
      this.users.athletes(),
      this.participationService.list(),
      this.performanceService.list(),
      this.sessionService.list(),
    ]).subscribe(([athletes, participations, performances, sessions]) => {
      this.athlete = athletes.find((item) => item.id === athleteId);
      this.loaded = true;
      if (!this.athlete) return;

      const sessionsById = new Map(sessions.map((session) => [session.id, session]));
      const ownParticipations = participations.filter((participation) => participation.user_id === athleteId);
      this.totalSessions = ownParticipations.length;
      this.sessionsAttended = ownParticipations.filter((participation) => participation.status === 'present').length;
      this.attendanceRate = this.totalSessions ? Math.round((this.sessionsAttended / this.totalSessions) * 100) : 0;

      const lastSession = ownParticipations
        .map((participation) => sessionsById.get(participation.session_id))
        .filter((session): session is NonNullable<typeof session> => !!session)
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())[0];
      this.lastActivity = lastSession
        ? new Date(lastSession.starts_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : null;

      this.performanceScores = performances
        .filter((performance) => performance.user_id === athleteId)
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
        .slice(-5)
        .map((performance) => performance.score);
    });
  }

  /** Hauteurs (%) des barres du mini-graphique, sur les 5 derniers scores. */
  get sparkBars(): number[] {
    return this.performanceScores.map((score) => Math.max(8, Math.min(100, score)));
  }

  get trendLabel(): string {
    if (this.performanceScores.length < 2) return 'Pas encore assez de données pour dégager une tendance.';
    const delta = this.performanceScores[this.performanceScores.length - 1] - this.performanceScores[0];
    return delta >= 0 ? 'Tendance positive sur les dernières séances.' : 'Tendance à surveiller sur les dernières séances.';
  }

  /** Initiales (jusqu'à 2) utilisées comme avatar textuel. */
  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
  }
}
