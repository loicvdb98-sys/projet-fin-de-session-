/**
 * Écran calendrier : vue mensuelle des séances, avec navigation entre mois,
 * sélection d'un jour et détail des séances de ce jour (inscription incluse).
 */
import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { SessionService, SportSession } from '@features/sessions/session.service';
import { ParticipationService, Participation } from '@features/participations/participation.service';
import { UserService } from '@features/athletes/user.service';
import { ToastService } from '@shared/services/toast.service';

interface CalendarDay {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  sessions: SportSession[];
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

@Component({
  standalone: true,
  imports: [DatePipe, MatCardModule, MatButtonModule],
  template: `
    <section class="page calendar-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">ORGANISATION</p>
          <h1>Calendrier</h1>
          <p class="text-secondary">Naviguez par mois et sélectionnez un jour pour voir ses séances.</p>
        </div>
        <div class="calendar-nav">
          <button mat-icon-button type="button" (click)="previousMonth()" aria-label="Mois précédent">‹</button>
          <span class="calendar-month-label">{{ viewDate | date:'MMMM yyyy' }}</span>
          <button mat-icon-button type="button" (click)="nextMonth()" aria-label="Mois suivant">›</button>
          <button mat-stroked-button type="button" class="teal-outline calendar-today-btn" (click)="goToday()">Aujourd'hui</button>
        </div>
      </div>

      @if (sessionsLoadError) {
        <p class="empty-state">Impossible de charger les séances. <button mat-button class="teal-action" (click)="loadSessions()">Réessayer</button></p>
      }
      <div class="calendar-grid">
        @for (label of weekdayLabels; track label) { <span class="calendar-weekday">{{ label }}</span> }
        @for (day of days; track day.date.getTime()) {
          <button
            type="button"
            class="calendar-day"
            [class.outside]="!day.inCurrentMonth"
            [class.today]="day.isToday"
            [class.selected]="day.isSelected"
            (click)="selectDay(day)"
          >
            <span class="calendar-day-number">{{ day.date.getDate() }}</span>
            @if (day.sessions.length) {
              <span class="calendar-day-badge" [class.many]="day.sessions.length > 1">{{ day.sessions.length }}</span>
            }
          </button>
        }
      </div>

      <h2 class="section-title">
        Séances du {{ selectedDate | date:'EEEE dd MMMM' }}
        <span class="status-badge info">{{ selectedDaySessions.length }}</span>
      </h2>

      @if (selectedDaySessions.length) {
        <div class="cards">
          @for (session of selectedDaySessions; track session.id) {
            <mat-card class="session-card">
              <div class="session-card-top">
                <span class="session-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 15l2.5 2.5L16 13"/></svg>
                </span>
                @if (isRegistered(session.id)) {
                  <span class="status-badge success">Inscrit</span>
                } @else {
                  <span class="status-badge" [class]="remainingSpots(session) > 0 ? 'info' : 'danger'">{{ remainingSpots(session) > 0 ? remainingSpots(session) + ' place(s)' : 'Complet' }}</span>
                }
              </div>
              <mat-card-title>{{ session.title }}</mat-card-title>
              <mat-card-content>
                <p class="session-date">{{ session.starts_at | date:'HH:mm' }}</p>
                <p class="text-secondary">{{ session.duration_minutes }} min · {{ session.registered_count }}/{{ session.capacity }} inscrits</p>
                <p class="session-coach">Coach : {{ session.coach_name }}</p>
                @if (session.description) { <p class="text-secondary">{{ session.description }}</p> }
              </mat-card-content>
              @if (!isRegistered(session.id)) {
                <mat-card-actions>
                  <button mat-button class="teal-action" [disabled]="remainingSpots(session) <= 0" (click)="register(session.id)">S'inscrire</button>
                </mat-card-actions>
              }
            </mat-card>
          }
        </div>
      } @else {
        <p class="empty-state">Aucune séance ce jour-là.</p>
      }
    </section>
  `
})
export class CalendarComponent {
  private readonly sessionService = inject(SessionService);
  private readonly participationService = inject(ParticipationService);
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);

  readonly weekdayLabels = WEEKDAY_LABELS;

  private sessions: SportSession[] = [];
  private participations: Participation[] = [];
  private currentUserId?: number;
  sessionsLoadError = false;

  /** Premier jour (à minuit) du mois actuellement affiché par la grille. */
  viewDate = this.startOfMonth(new Date());
  selectedDate = new Date();
  days: CalendarDay[] = [];
  selectedDaySessions: SportSession[] = [];

  constructor() {
    this.loadSessions();
    // Connaître l'utilisateur courant et ses inscriptions pour afficher le badge "Inscrit".
    this.users.me().subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.participationService.list().subscribe({
          next: (participations) => { this.participations = participations; this.rebuild(); },
          error: () => this.toast.error('Impossible de charger vos inscriptions.')
        });
      },
      error: () => this.toast.error('Impossible de charger votre profil.')
    });
    this.rebuild();
  }

  loadSessions(): void {
    this.sessionsLoadError = false;
    this.sessionService.list().subscribe({
      next: (sessions) => { this.sessions = sessions; this.rebuild(); },
      error: () => { this.sessionsLoadError = true; }
    });
  }

  previousMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.rebuild();
  }

  nextMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.rebuild();
  }

  /** Revient au mois courant et sélectionne le jour présent. */
  goToday(): void {
    const now = new Date();
    this.viewDate = this.startOfMonth(now);
    this.selectedDate = now;
    this.rebuild();
  }

  selectDay(day: CalendarDay): void {
    this.selectedDate = day.date;
    if (!day.inCurrentMonth) this.viewDate = this.startOfMonth(day.date);
    this.rebuild();
  }

  isRegistered(sessionId: number): boolean {
    return this.participations.some((p) => p.session_id === sessionId && p.user_id === this.currentUserId);
  }

  /** Places encore disponibles pour une séance (jamais négatif). */
  remainingSpots(session: SportSession): number {
    return Math.max(0, session.capacity - session.registered_count);
  }

  /** Inscrit l'utilisateur connecté à une séance depuis le calendrier, sans quitter la page. */
  register(sessionId: number): void {
    if (!this.currentUserId) return;
    this.participationService.create(this.currentUserId, sessionId).subscribe({
      next: (participation) => {
        this.participations = [...this.participations, participation];
        const session = this.sessions.find((item) => item.id === sessionId);
        if (session) session.registered_count += 1;
        this.toast.success('Inscription confirmée.');
        this.rebuild();
      },
      error: () => this.toast.error('Impossible de vous inscrire à cette séance.')
    });
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private dayKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private sameDay(a: Date, b: Date): boolean {
    return this.dayKey(a) === this.dayKey(b);
  }

  /** Regroupe les séances chargées par jour civil local, pour un accès O(1) depuis la grille. */
  private groupSessionsByDay(): Map<string, SportSession[]> {
    const map = new Map<string, SportSession[]>();
    for (const session of this.sessions) {
      const key = this.dayKey(new Date(session.starts_at));
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return map;
  }

  /** Recalcule la grille (6 semaines, du lundi au dimanche) et le détail du jour sélectionné. */
  private rebuild(): void {
    const byDay = this.groupSessionsByDay();
    const today = new Date();
    const month = this.viewDate.getMonth();
    const firstWeekday = (this.viewDate.getDay() + 6) % 7; // 0 = lundi
    const gridStart = new Date(this.viewDate.getFullYear(), month, 1 - firstWeekday);

    this.days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      return {
        date,
        inCurrentMonth: date.getMonth() === month,
        isToday: this.sameDay(date, today),
        isSelected: this.sameDay(date, this.selectedDate),
        sessions: byDay.get(this.dayKey(date)) ?? [],
      };
    });
    this.selectedDaySessions = byDay.get(this.dayKey(this.selectedDate)) ?? [];
  }
}
