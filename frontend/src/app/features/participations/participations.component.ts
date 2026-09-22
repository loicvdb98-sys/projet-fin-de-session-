import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { BehaviorSubject, combineLatest, map, switchMap } from 'rxjs';
import { SessionService } from '@features/sessions/session.service';
import { ParticipationService } from './participation.service';
import { ToastService } from '@shared/services/toast.service';
import { markForCheck } from '@core/mark-for-check.operator';

/**
 * Écran "Mes participations" : croise les inscriptions du sportif avec les
 * détails de séance (titre, date, coach), au même style « module » que la
 * page Séances - un rail listant toutes les participations (à venir puis
 * terminées, chacune triée chronologiquement) et le détail de celle
 * sélectionnée.
 */

type ParticipationStatus = 'inscrit' | 'present' | 'absent';
interface EnrichedParticipation {
  id: number; session_id: number; status: string;
  sessionTitle: string; startsAt: string; durationMinutes: number; coachName: string;
  upcoming: boolean;
}

const STATUS_META: Record<ParticipationStatus, { label: string; badge: 'info' | 'primary' | 'danger' }> = {
  inscrit: { label: 'Inscrit', badge: 'info' },
  present: { label: 'Présent', badge: 'primary' },
  absent: { label: 'Absent', badge: 'danger' },
};

@Component({
  standalone: true,
  imports: [DatePipe, MatButtonModule],
  template: `
    <section class="page participations-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">SUIVI</p>
          <h1>Mes participations</h1>
          <p class="text-secondary">Retrouvez vos inscriptions, passées et à venir, avec leur statut.</p>
        </div>
      </div>

      @if (items; as list) {
        @if (!list.length) {
          <p class="empty-state">Vous n'avez encore aucune participation. Inscrivez-vous à une séance pour la retrouver ici.</p>
        } @else {
          <div class="module-shell">
            <nav class="module-rail" aria-label="Participations">
              @for (item of list; track item.id) {
                <button
                  type="button"
                  class="module-rail-item"
                  [class]="'c-' + statusMeta(item.status).badge"
                  [class.active]="item.id === selectedId"
                  [attr.aria-current]="item.id === selectedId ? 'true' : null"
                  (click)="selectedId = item.id">
                  <span class="module-rail-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 15l2.5 2.5L16 13"/></svg>
                  </span>
                  <span class="module-rail-text">
                    <span class="module-rail-label">{{ item.sessionTitle }}</span>
                    <small class="module-rail-sublabel">{{ item.startsAt ? (item.startsAt | date:'dd/MM HH:mm') : 'Séance supprimée' }}</small>
                  </span>
                  @if (!item.upcoming) { <span class="module-rail-dot" title="Terminée"></span> }
                </button>
              }
            </nav>

            <div class="module-detail">
              @if (selectedItem; as item) {
                <div class="module-detail-card" [class]="'c-' + statusMeta(item.status).badge">
                  <div class="module-detail-header">
                    <span class="module-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 15l2.5 2.5L16 13"/></svg>
                    </span>
                    <div>
                      <p class="eyebrow">PARTICIPATION{{ item.upcoming ? ' · À VENIR' : ' · TERMINÉE' }}</p>
                      <h2>{{ item.sessionTitle }}</h2>
                    </div>
                    <span class="module-badge">{{ statusMeta(item.status).label }}</span>
                  </div>

                  <p class="text-secondary">{{ item.startsAt ? formatFullDate(item.startsAt) : 'Cette séance a été supprimée.' }}{{ item.startsAt ? ' · ' + item.durationMinutes + ' min' : '' }}</p>
                  @if (item.coachName) { <span class="module-stat-line text-secondary">Coach : {{ item.coachName }}</span> }

                  @if (item.upcoming && item.status === 'inscrit') {
                    <div class="module-detail-actions">
                      <button type="button" class="action-chip danger" (click)="cancel(item.id)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
                        Se désinscrire
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }
    </section>
  `
})
export class ParticipationsComponent {
  private readonly service = inject(ParticipationService);
  private readonly sessions = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly cd = inject(ChangeDetectorRef);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  items: EnrichedParticipation[] = [];
  selectedId?: number;

  constructor() {
    // Une participation ne référence qu'un session_id : on enrichit avec les détails de la
    // séance correspondante pour l'affichage (titre, date, durée), triés comme avant
    // (à venir d'abord par proximité, puis terminées de la plus récente à la plus ancienne).
    this.refresh$.pipe(
      switchMap(() => combineLatest([this.service.list(), this.sessions.list()])),
      map(([participations, sessions]) => {
        const now = new Date();
        const enriched = participations.map((participation): EnrichedParticipation => {
          const session = sessions.find((s) => s.id === participation.session_id);
          const startsAt = session?.starts_at ?? '';
          return {
            ...participation,
            sessionTitle: session?.title ?? 'Séance supprimée',
            startsAt,
            durationMinutes: session?.duration_minutes ?? 0,
            coachName: session?.coach_name ?? '',
            upcoming: !!startsAt && new Date(startsAt) >= now,
          };
        });
        const upcoming = enriched.filter((item) => item.upcoming).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        const past = enriched.filter((item) => !item.upcoming).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
        return [...upcoming, ...past];
      }),
      markForCheck(this.cd)
    ).subscribe((list) => { this.items = list; });
  }

  get selectedItem(): EnrichedParticipation | undefined {
    return this.items.find((item) => item.id === this.selectedId) ?? this.items[0];
  }

  statusMeta(status: string) {
    return STATUS_META[status as ParticipationStatus] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), badge: 'info' as const };
  }

  /** Date complète en français avec majuscule initiale (ex. "Dimanche 06 septembre à 11:47"). */
  formatFullDate(iso: string): string {
    const formatted = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  /** Supprime la participation (désinscription) et rafraîchit la liste, sans recharger la page. */
  cancel(id: number): void {
    this.service.remove(id).subscribe({
      next: () => { this.toast.success('Désinscription confirmée.'); this.refresh$.next(); },
      error: () => this.toast.error('Impossible de vous désinscrire de cette séance.')
    });
  }
}
