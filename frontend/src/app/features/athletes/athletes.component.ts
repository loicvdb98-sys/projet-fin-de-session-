/**
 * Écran coach listant les sportifs suivis, avec un résumé d'assiduité (calculé
 * à partir de leurs participations réelles) et un accès rapide à leur suivi individuel.
 */
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { User, UserService } from './user.service';
import { ParticipationService } from '@features/participations/participation.service';
import { SessionService } from '@features/sessions/session.service';

interface AthleteSummary extends User {
  attendanceRate: number;
  sessionsAttended: number;
  totalSessions: number;
  lastActivity: string | null;
}

@Component({
  standalone: true,
  imports: [AsyncPipe, MatCardModule, MatButtonModule, RouterLink],
  template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">ESPACE COACH</p>
          <h1>Mes sportifs</h1>
          <p class="text-secondary">Retrouvez les sportifs actifs et accédez rapidement à leur suivi.</p>
        </div>
      </div>

      @if (athletes$ | async; as athletes) {
        <div class="athlete-grid">
          @for (athlete of athletes; track athlete.id) {
            <mat-card class="athlete-card">
              <div class="profile-avatar small-avatar" aria-hidden="true">{{ initials(athlete.full_name) }}</div>
              <div>
                <h2>{{ athlete.full_name }}</h2>
                <p class="text-secondary">{{ athlete.email }}</p>
                <span class="status-badge" [class]="athlete.is_active ? 'success' : 'danger'">{{ athlete.is_active ? 'Actif' : 'Désactivé' }}</span>
              </div>

              <div class="athlete-details">
                <div>
                  <small>Taux de présence</small>
                  <strong>{{ athlete.attendanceRate }} %</strong>
                </div>
                <div class="athlete-stat">
                  <span><small>Séances suivies</small><strong>{{ athlete.sessionsAttended }}/{{ athlete.totalSessions }}</strong></span>
                  <span><small>Dernière activité</small><strong>{{ athlete.lastActivity || '—' }}</strong></span>
                </div>
                <div class="goal-progress"><span [style.width.%]="athlete.attendanceRate"></span></div>
                <small class="progress-label">Assiduité : {{ athlete.attendanceRate }} %</small>
              </div>

              <a mat-stroked-button [routerLink]="['/athletes', athlete.id]">Voir le suivi</a>
            </mat-card>
          } @empty {
            <mat-card class="empty-state-card"><h2>Aucun sportif</h2><p class="text-secondary">Les sportifs inscrits apparaîtront ici.</p></mat-card>
          }
        </div>
      }
    </section>
  `
})
/** Liste des sportifs sous forme de cartes, avec avatar généré à partir des initiales. */
export class AthletesComponent {
  private readonly users = inject(UserService);
  private readonly participationService = inject(ParticipationService);
  private readonly sessionService = inject(SessionService);

  // Une participation ne porte que le statut ; on la croise avec les séances pour dater
  // la dernière activité, et on l'agrège par sportif pour un taux de présence réel.
  readonly athletes$ = combineLatest([
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
    })
  );

  /** Initiales (jusqu'à 2) utilisées comme avatar textuel. */
  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
  }
}
