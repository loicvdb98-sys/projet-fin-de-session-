import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { combineLatest, map } from 'rxjs';
import { SessionService } from '@features/sessions/session.service';
import { ParticipationService } from './participation.service';
import { ToastService } from '@shared/services/toast.service';

/**
 * Écran "Mes participations" : croise les inscriptions du sportif avec les
 * détails de séance, puis les répartit entre séances à venir et terminées.
 */

type ParticipationStatus = 'inscrit' | 'present' | 'absent';
interface EnrichedParticipation {
  id: number; session_id: number; status: string;
  sessionTitle: string; startsAt: string; durationMinutes: number; coachName: string;
}

const STATUS_META: Record<ParticipationStatus, { label: string; badge: string }> = {
  inscrit: { label: 'Inscrit', badge: 'info' },
  present: { label: 'Présent', badge: 'success' },
  absent: { label: 'Absent', badge: 'danger' },
};

@Component({
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatCardModule, MatButtonModule],
  template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">SUIVI</p>
          <h1>Mes participations</h1>
          <p class="text-secondary">Retrouvez vos inscriptions, passées et à venir, avec leur statut.</p>
        </div>
      </div>

      @if (grouped$ | async; as grouped) {
        @if (!grouped.upcoming.length && !grouped.past.length) {
          <p class="empty-state">Vous n'avez encore aucune participation. Inscrivez-vous à une séance pour la retrouver ici.</p>
        }

        @if (grouped.upcoming.length) {
          <h2 class="section-title">À venir <span class="status-badge info">{{ grouped.upcoming.length }}</span></h2>
          <div class="cards">
            @for (item of grouped.upcoming; track item.id) {
              <mat-card class="session-card">
                <div class="session-card-top">
                  <span class="session-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 15l2.5 2.5L16 13"/></svg>
                  </span>
                  <span class="status-badge" [class]="statusMeta(item.status).badge">{{ statusMeta(item.status).label }}</span>
                </div>
                <mat-card-title>{{ item.sessionTitle }}</mat-card-title>
                <mat-card-content>
                  <p class="session-date">{{ item.startsAt | date:'dd/MM/yyyy à HH:mm' }}</p>
                  <p class="text-secondary">{{ item.durationMinutes }} min</p>
                  @if (item.coachName) { <p class="session-coach">Coach : {{ item.coachName }}</p> }
                </mat-card-content>
                @if (item.status === 'inscrit') {
                  <mat-card-actions>
                    <button mat-button class="danger-action" (click)="cancel(item.id)">Se désinscrire</button>
                  </mat-card-actions>
                }
              </mat-card>
            }
          </div>
        }

        @if (grouped.past.length) {
          <h2 class="section-title">Terminées <span class="status-badge info">{{ grouped.past.length }}</span></h2>
          <div class="cards">
            @for (item of grouped.past; track item.id) {
              <mat-card class="session-card past">
                <div class="session-card-top">
                  <span class="session-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 15l2.5 2.5L16 13"/></svg>
                  </span>
                  <span class="status-badge" [class]="statusMeta(item.status).badge">{{ statusMeta(item.status).label }}</span>
                </div>
                <mat-card-title>{{ item.sessionTitle }}</mat-card-title>
                <mat-card-content>
                  <p class="session-date">{{ item.startsAt | date:'dd/MM/yyyy à HH:mm' }}</p>
                  <p class="text-secondary">{{ item.durationMinutes }} min</p>
                  @if (item.coachName) { <p class="session-coach">Coach : {{ item.coachName }}</p> }
                </mat-card-content>
              </mat-card>
            }
          </div>
        }
      }
    </section>
  `
})
export class ParticipationsComponent {
  private readonly service = inject(ParticipationService);
  private readonly toast = inject(ToastService);

  // Une participation ne référence qu'un session_id : on enrichit avec les détails de la
  // séance correspondante pour l'affichage (titre, date, durée).
  private readonly enriched$ = combineLatest([this.service.list(), inject(SessionService).list()]).pipe(
    map(([participations, sessions]) => participations.map((participation): EnrichedParticipation => {
      const session = sessions.find((s) => s.id === participation.session_id);
      return {
        ...participation,
        sessionTitle: session?.title ?? 'Séance supprimée',
        startsAt: session?.starts_at ?? '',
        durationMinutes: session?.duration_minutes ?? 0,
        coachName: session?.coach_name ?? '',
      };
    }))
  );

  /** Sépare les participations en deux listes triées : séances à venir et séances passées. */
  readonly grouped$ = this.enriched$.pipe(
    map((items) => {
      const now = new Date();
      const upcoming = items
        .filter((item) => item.startsAt && new Date(item.startsAt) >= now)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      const past = items
        .filter((item) => !item.startsAt || new Date(item.startsAt) < now)
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
      return { upcoming, past };
    })
  );

  statusMeta(status: string) {
    return STATUS_META[status as ParticipationStatus] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), badge: 'info' };
  }

  /** Supprime la participation (désinscription) puis recharge la page. */
  cancel(id: number): void {
    this.service.remove(id).subscribe({
      next: () => { this.toast.showOnNextLoad('Désinscription confirmée.'); location.reload(); },
      error: () => this.toast.error('Impossible de vous désinscrire de cette séance.')
    });
  }
}
