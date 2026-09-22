import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { BehaviorSubject, combineLatest, map, of, switchMap } from 'rxjs';
import { SessionService } from '@features/sessions/session.service';
import { ParticipationService } from './participation.service';
import { UserService } from '@features/athletes/user.service';
import { ToastService } from '@shared/services/toast.service';
import { markForCheck } from '@core/mark-for-check.operator';

/**
 * Écran "Participations" : croise les inscriptions avec les détails de séance
 * (titre, date, coach), au même style « module » que la page Séances - un
 * rail listant toutes les participations (à venir puis terminées, chacune
 * triée chronologiquement) et le détail de celle sélectionnée.
 *
 * Le service renvoie les inscriptions du sportif connecté, mais toutes celles
 * des séances encadrées pour un coach (toutes les séances pour un admin) : on
 * affiche alors en plus le nom du sportif concerné par chaque inscription.
 */

type ParticipationStatus = 'inscrit' | 'present' | 'absent';
interface EnrichedParticipation {
  id: number; session_id: number; status: string;
  sessionTitle: string; startsAt: string; durationMinutes: number; coachName: string;
  athleteName: string | null; upcoming: boolean;
}

const STATUS_META: Record<ParticipationStatus, { label: string; badge: 'info' | 'primary' | 'danger' }> = {
  inscrit: { label: 'Inscrit', badge: 'info' },
  present: { label: 'Présent', badge: 'primary' },
  absent: { label: 'Absent', badge: 'danger' },
};

@Component({
  standalone: true,
  imports: [DatePipe, NgTemplateOutlet, MatButtonModule, MatCardModule],
  template: `
    <section class="page participations-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">SUIVI</p>
          <h1>{{ isManager ? 'Participations' : 'Mes participations' }}</h1>
          <p class="text-secondary">{{ isManager ? 'Inscriptions à vos séances, passées et à venir, avec leur statut.' : 'Retrouvez vos inscriptions, passées et à venir, avec leur statut.' }}</p>
        </div>
      </div>

      @if (loading) {
        <p class="text-secondary">Chargement des participations…</p>
      } @else if (loadError) {
        <p class="empty-state">Impossible de charger les participations. <button mat-button class="teal-action" (click)="refresh()">Réessayer</button></p>
      } @else if (!items.length) {
        <p class="empty-state">{{ isManager ? 'Aucune inscription pour vos séances pour le moment.' : "Vous n'avez encore aucune participation. Inscrivez-vous à une séance pour la retrouver ici." }}</p>
      } @else {
        <div class="cards">
          <mat-card class="stat-card accent">
            <mat-card-title>À venir</mat-card-title>
            <strong class="stat-value">{{ upcomingItems.length }}</strong>
            <p class="text-secondary">inscription(s) à venir</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Terminées</mat-card-title>
            <strong class="stat-value">{{ pastItems.length }}</strong>
            <p class="text-secondary">séance(s) passée(s)</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Taux de présence</mat-card-title>
            <strong class="stat-value">{{ attendanceRate === null ? '—' : attendanceRate + '%' }}</strong>
            <p class="text-secondary">{{ presentCount }}/{{ pastItems.length }} présence(s)</p>
          </mat-card>
        </div>

        <div class="module-shell">
          <nav class="module-rail" aria-label="Participations">
            @if (upcomingItems.length) {
              <p class="app-rail-section">À venir</p>
              @for (item of upcomingItems; track item.id) {
                <ng-container *ngTemplateOutlet="railItemTpl; context: { item: item }"></ng-container>
              }
            }
            @if (pastItems.length) {
              <p class="app-rail-section">Terminées</p>
              @for (item of pastItems; track item.id) {
                <ng-container *ngTemplateOutlet="railItemTpl; context: { item: item }"></ng-container>
              }
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
                @if (isManager && item.athleteName) { <span class="module-stat-line text-secondary">Sportif : {{ item.athleteName }}</span> }

                @if (item.upcoming && item.status === 'inscrit') {
                  <div class="module-detail-actions">
                    <button type="button" class="action-chip danger" (click)="cancel(item.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
                      {{ isManager ? "Retirer l'inscription" : 'Se désinscrire' }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <ng-template #railItemTpl let-item="item">
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
              <small class="module-rail-sublabel">{{ isManager && item.athleteName ? item.athleteName + ' · ' : '' }}{{ item.startsAt ? (item.startsAt | date:'dd/MM HH:mm') : 'Séance supprimée' }}</small>
            </span>
          </button>
        </ng-template>
      }
    </section>
  `
})
export class ParticipationsComponent {
  private readonly service = inject(ParticipationService);
  private readonly sessions = inject(SessionService);
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly cd = inject(ChangeDetectorRef);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  loading = true;
  loadError = false;
  isManager = false;
  items: EnrichedParticipation[] = [];
  upcomingItems: EnrichedParticipation[] = [];
  pastItems: EnrichedParticipation[] = [];
  selectedId?: number;

  // Le rôle n'est pas dans le token JWT décodable côté client : on le récupère via le profil
  // pour savoir si les inscriptions affichées sont celles du sportif connecté ou celles, plus
  // nombreuses, des séances qu'il encadre (coach/admin) - auquel cas il faut afficher le nom
  // du sportif concerné par chaque ligne. `users.list()` est réservé aux comptes coach/admin,
  // on ne l'appelle donc jamais pour un sportif.
  constructor() {
    this.users.me().pipe(markForCheck(this.cd)).subscribe((user) => {
      this.isManager = user.role === 'coach' || user.role === 'admin';
      this.load();
    });
  }

  private load(): void {
    this.refresh$.pipe(
      switchMap(() => combineLatest([
        this.service.list(),
        this.sessions.list(),
        this.isManager ? this.users.list() : of([])
      ])),
      map(([participations, sessions, athletes]) => {
        const now = new Date();
        const athleteNames = new Map(athletes.map((athlete) => [athlete.id, athlete.full_name]));
        const enriched = participations.map((participation): EnrichedParticipation => {
          const session = sessions.find((s) => s.id === participation.session_id);
          const startsAt = session?.starts_at ?? '';
          return {
            ...participation,
            sessionTitle: session?.title ?? 'Séance supprimée',
            startsAt,
            durationMinutes: session?.duration_minutes ?? 0,
            coachName: session?.coach_name ?? '',
            athleteName: this.isManager ? (athleteNames.get(participation.user_id) ?? `Utilisateur #${participation.user_id}`) : null,
            upcoming: !!startsAt && new Date(startsAt) >= now,
          };
        });
        const upcoming = enriched.filter((item) => item.upcoming).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        const past = enriched.filter((item) => !item.upcoming).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
        return { upcoming, past };
      }),
      markForCheck(this.cd)
    ).subscribe({
      next: ({ upcoming, past }) => {
        this.upcomingItems = upcoming;
        this.pastItems = past;
        this.items = [...upcoming, ...past];
        this.loading = false;
        this.loadError = false;
      },
      error: () => { this.loading = false; this.loadError = true; }
    });
  }

  refresh(): void {
    this.loading = true;
    this.loadError = false;
    this.refresh$.next();
  }

  get selectedItem(): EnrichedParticipation | undefined {
    return this.items.find((item) => item.id === this.selectedId) ?? this.items[0];
  }

  get presentCount(): number {
    return this.pastItems.filter((item) => item.status === 'present').length;
  }

  /** Pourcentage de présences parmi les séances passées, ou `null` s'il n'y en a aucune. */
  get attendanceRate(): number | null {
    return this.pastItems.length ? Math.round((this.presentCount / this.pastItems.length) * 100) : null;
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
      next: () => { this.toast.success(this.isManager ? 'Inscription retirée.' : 'Désinscription confirmée.'); this.refresh(); },
      error: () => this.toast.error(this.isManager ? "Impossible de retirer cette inscription." : 'Impossible de vous désinscrire de cette séance.')
    });
  }
}
