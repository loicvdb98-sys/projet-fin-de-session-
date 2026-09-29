/**
 * Écran coach listant les sportifs suivis, au même style « module » que les
 * autres pages : un résumé chiffré, un rail des sportifs et le détail du sportif
 * sélectionné (assiduité calculée à partir de ses participations réelles, avec
 * un accès à son suivi individuel).
 */
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { User, UserService } from './user.service';
import { ParticipationService } from '@features/participations/participation.service';
import { SessionService } from '@features/sessions/session.service';
import { markForCheck } from '@core/mark-for-check.operator';

interface AthleteSummary extends User {
  attendanceRate: number;
  sessionsAttended: number;
  totalSessions: number;
  lastActivity: string | null;
}

@Component({
  standalone: true,
  imports: [MatButtonModule, MatCardModule, RouterLink],
  template: `
    <section class="page module-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">ESPACE COACH</p>
          <h1>Mes sportifs</h1>
          <p class="text-secondary">Retrouvez les sportifs actifs et accédez rapidement à leur suivi.</p>
        </div>
      </div>

      @if (loading) {
        <p class="text-secondary">Chargement des sportifs…</p>
      } @else if (loadError) {
        <p class="empty-state">Impossible de charger les sportifs. <button mat-button class="teal-action" (click)="load()">Réessayer</button></p>
      } @else if (!athletes.length) {
        <p class="empty-state">Aucun sportif pour le moment : les sportifs inscrits apparaîtront ici.</p>
      } @else {
        <div class="cards">
          <mat-card class="stat-card accent">
            <mat-card-title>Sportifs suivis</mat-card-title>
            <strong class="stat-value">{{ athletes.length }}</strong>
            <p class="text-secondary">compte(s) sportif actif(s)</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Présence moyenne</mat-card-title>
            <strong class="stat-value">{{ averageAttendance }}%</strong>
            <p class="text-secondary">sur l’ensemble des sportifs</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Sans inscription</mat-card-title>
            <strong class="stat-value">{{ withoutActivity }}</strong>
            <p class="text-secondary">sportif(s) sans séance</p>
          </mat-card>
        </div>

        <div class="module-shell">
          <nav class="module-rail" aria-label="Sportifs">
            <p class="app-rail-section">Sportifs</p>
            @for (athlete of athletes; track athlete.id) {
              <button type="button" class="module-rail-item" [class]="tint(athlete)" [class.active]="athlete.id === selectedId" [attr.aria-current]="athlete.id === selectedId ? 'true' : null" (click)="selectedId = athlete.id">
                <span class="module-rail-icon module-initials" aria-hidden="true">{{ initials(athlete.full_name) }}</span>
                <span class="module-rail-text">
                  <span class="module-rail-label">{{ athlete.full_name }}</span>
                  <small class="module-rail-sublabel">Présence {{ athlete.attendanceRate }} % · {{ athlete.sessionsAttended }}/{{ athlete.totalSessions }}</small>
                </span>
              </button>
            }
          </nav>

          <div class="module-detail">
            @if (selectedAthlete; as athlete) {
              <div class="module-detail-card" [class]="tint(athlete)">
                <div class="module-detail-header">
                  <span class="module-icon module-initials" aria-hidden="true">{{ initials(athlete.full_name) }}</span>
                  <div>
                    <p class="eyebrow">SPORTIF</p>
                    <h2>{{ athlete.full_name }}</h2>
                  </div>
                  <span class="module-badge">{{ athlete.is_active ? 'Actif' : 'Désactivé' }}</span>
                </div>

                <p class="text-secondary">{{ athlete.email }}</p>

                <div class="goal-meter">
                  <div class="goal-meter-head">
                    <strong class="goal-meter-value">{{ athlete.attendanceRate }} %</strong>
                    <span class="text-secondary">{{ athlete.sessionsAttended }}/{{ athlete.totalSessions }} séance(s) suivie(s)</span>
                  </div>
                  <div class="goal-progress"><span [style.width.%]="athlete.attendanceRate"></span></div>
                </div>
                <span class="module-stat-line text-secondary">Dernière activité : {{ athlete.lastActivity || 'aucune séance' }}</span>

                <div class="module-detail-actions">
                  <a class="action-chip primary" [routerLink]="['/athletes', athlete.id]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/></svg>
                    Voir le suivi complet
                  </a>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </section>
  `
})
export class AthletesComponent {
  private readonly users = inject(UserService);
  private readonly participationService = inject(ParticipationService);
  private readonly sessionService = inject(SessionService);
  private readonly cd = inject(ChangeDetectorRef);
  athletes: AthleteSummary[] = [];
  selectedId: number | null = null;
  loading = true;
  loadError = false;

  constructor() { this.load(); }

  get selectedAthlete(): AthleteSummary | undefined {
    return this.athletes.find((athlete) => athlete.id === this.selectedId);
  }

  get averageAttendance(): number {
    return this.athletes.length ? Math.round(this.athletes.reduce((sum, athlete) => sum + athlete.attendanceRate, 0) / this.athletes.length) : 0;
  }

  get withoutActivity(): number { return this.athletes.filter((athlete) => athlete.totalSessions === 0).length; }

  // Une participation ne porte que le statut ; on la croise avec les séances pour dater
  // la dernière activité, et on l'agrège par sportif pour un taux de présence réel.
  load(): void {
    this.loading = true;
    this.loadError = false;
    combineLatest([
      this.users.athletes(),
      this.participationService.list(),
      this.sessionService.list()
    ]).pipe(
      map(([athletes, participations, sessions]): AthleteSummary[] => {
        const sessionsById = new Map(sessions.map((session) => [session.id, session]));
        return athletes.map((athlete) => {
          const own = participations.filter((participation) => participation.user_id === athlete.id);
          const attended = own.filter((participation) => participation.status === 'present').length;
          const lastSession = own
            .map((participation) => sessionsById.get(participation.session_id))
            .filter((session): session is NonNullable<typeof session> => !!session)
            .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())[0];
          return {
            ...athlete,
            totalSessions: own.length,
            sessionsAttended: attended,
            attendanceRate: own.length ? Math.round((attended / own.length) * 100) : 0,
            lastActivity: lastSession ? new Date(lastSession.starts_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null,
          };
        });
      }),
      markForCheck(this.cd)
    ).subscribe({
      next: (athletes) => {
        this.athletes = athletes;
        this.selectedId = athletes[0]?.id ?? null;
        this.loading = false;
      },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  /** Couleur du module selon l'assiduité : vert à partir de 70 %, bleu dès 40 %, rouge en dessous. */
  tint(athlete: AthleteSummary): string {
    if (!athlete.totalSessions) return 'c-secondary';
    return athlete.attendanceRate >= 70 ? 'c-success' : athlete.attendanceRate >= 40 ? 'c-info' : 'c-danger';
  }

  /** Initiales (jusqu'à 2) utilisées comme avatar textuel. */
  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
  }
}
