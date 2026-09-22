/**
 * Tableau de bord principal : agrège les données de tous les modules
 * (séances, participations, performances, objectifs, programmes, journal,
 * notifications, sportifs suivis) pour afficher un aperçu par module
 * sélectionnable, plus la prochaine séance et un message d'accroche.
 */
import { Component, inject } from '@angular/core';
import { AsyncPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { combineLatest, map, of, shareReplay } from 'rxjs';
import { StatisticsService } from '@shared/services/statistics.service';
import { AuthService } from '@features/auth/auth.service';
import { UserService } from '@features/athletes/user.service';
import { SessionService, SportSession } from '@features/sessions/session.service';
import { PerformanceService } from '@features/performances/performance.service';
import { NotificationService } from '@features/notifications/notification.service';
import { GoalService } from '@features/goals/goal.service';
import { ParticipationService } from '@features/participations/participation.service';
import { ProgramService } from '@features/programs/program.service';
import { JournalService } from '@features/journal/journal.service';

type ModuleColor = 'primary' | 'secondary' | 'success' | 'warning' | 'info';
interface DashboardModule { key: string; title: string; description: string; link: string; color: ModuleColor; }

const MODULES: DashboardModule[] = [
  { key: 'sessions', title: 'Séances', description: 'Consultez et gérez vos séances d’entraînement.', link: '/sessions', color: 'secondary' },
  { key: 'calendar', title: 'Calendrier', description: 'Visualisez votre planning à venir.', link: '/calendar', color: 'info' },
  { key: 'participations', title: 'Participations', description: 'Suivez vos inscriptions aux séances.', link: '/participations', color: 'success' },
  { key: 'performances', title: 'Performances', description: 'Analysez vos résultats et votre progression.', link: '/performances', color: 'primary' },
  { key: 'goals', title: 'Objectifs', description: 'Définissez vos cibles et records personnels.', link: '/goals', color: 'warning' },
  { key: 'programs', title: 'Programmes', description: 'Suivez vos programmes d’entraînement.', link: '/programs', color: 'secondary' },
  { key: 'journal', title: 'Journal', description: 'Consignez vos ressentis après chaque séance.', link: '/journal', color: 'info' },
  { key: 'notifications', title: 'Notifications', description: 'Restez informé des dernières alertes.', link: '/notifications', color: 'warning' },
];

const COACH_MODULES: DashboardModule[] = [
  { key: 'athletes', title: 'Sportifs', description: 'Suivez vos athlètes et leur progression.', link: '/athletes', color: 'primary' },
  { key: 'workout-new', title: 'Créer une séance', description: 'Composez un nouvel entraînement.', link: '/workouts/new', color: 'success' },
];

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmée', pending: 'En attente', cancelled: 'Annulée', attended: 'Suivie',
};

@Component({
  standalone: true,
  imports: [AsyncPipe, SlicePipe, RouterLink],
  template: `
    <section class="page home-page">
      <div class="home-hero">
        <div>
          <p class="eyebrow">VOTRE ESPACE SPORTIF</p>
          @if (user$ | async; as user) { <h1>Bonjour {{ firstName(user.full_name) }}</h1> } @else { <h1>Bonjour</h1> }
          <p class="text-secondary">{{ (tagline$ | async) || 'Choisissez un module pour continuer votre entraînement.' }}</p>
        </div>
        <span class="status-badge success"><span aria-hidden="true">●</span> Actif</span>
      </div>

      @if (nextSession$ | async; as next) {
        <a class="next-session-card" routerLink="/sessions">
          <span class="next-session-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>
            </svg>
          </span>
          <span class="next-session-body">
            <span class="eyebrow">PROCHAINE SÉANCE</span>
            <strong>{{ next.title }}</strong>
            <span class="text-secondary">{{ formatSessionDate(next.starts_at) }} · {{ next.duration_minutes }} min · Coach : {{ next.coach_name }} · {{ remainingSpots(next) > 0 ? remainingSpots(next) + ' places restantes' : 'Complet' }}</span>
          </span>
          <span class="next-session-cta">Voir →</span>
        </a>
      } @else {
        <div class="next-session-card empty">
          <span class="text-secondary">Aucune séance à venir pour le moment.</span>
          <a routerLink="/sessions" class="next-session-cta">Voir les séances →</a>
        </div>
      }

      <div class="module-shell">
        <nav class="module-rail" aria-label="Modules">
          @for (module of modules; track module.link) {
            <button
              type="button"
              class="module-rail-item"
              [class]="'c-' + module.color"
              [class.active]="module.key === selectedKey"
              [attr.aria-current]="module.key === selectedKey ? 'true' : null"
              (click)="selectModule(module.key)">
              <span class="module-rail-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  @switch (module.key) {
                    @case ('sessions') { <path d="M4 9v6M2 10v4M22 10v4M20 9v6M7 8v8M17 8v8M7 12h10"/> }
                    @case ('calendar') { <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/> }
                    @case ('participations') { <circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/> }
                    @case ('performances') { <path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/> }
                    @case ('goals') { <circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none"/> }
                    @case ('programs') { <rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8 11h8M8 15h8M8 19h4"/> }
                    @case ('journal') { <path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h5"/> }
                    @case ('notifications') { <path d="M6 10a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/> }
                    @case ('athletes') { <circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.3 2.9-6 5.5-6s5.5 2.7 5.5 6"/><circle cx="17.5" cy="9" r="2.3"/><path d="M15.2 20c.2-2.4 1.9-4.5 4.8-4.5"/> }
                    @case ('workout-new') { <circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/> }
                  }
                </svg>
              </span>
              <span class="module-rail-label">{{ module.title }}</span>
              @if (module.key === 'notifications' && (unreadCount$ | async); as count) {
                <span class="module-rail-dot" [attr.title]="count + ' non lue' + (count > 1 ? 's' : '')"></span>
              }
            </button>
          }
        </nav>

        <div class="module-detail">
          @if (!(ready$ | async)) {
            <div class="module-detail-card skeleton-card" aria-hidden="true">
              <div class="module-detail-header">
                <span class="module-icon skeleton-block"></span>
                <div>
                  <span class="skeleton-line" style="width:4rem"></span>
                  <span class="skeleton-line" style="width:8rem;height:1.3rem;margin-top:.5rem"></span>
                </div>
              </div>
              <span class="skeleton-line" style="width:85%"></span>
              <span class="skeleton-line" style="width:55%"></span>
              <div class="skeleton-preview">
                <span class="skeleton-line"></span>
                <span class="skeleton-line"></span>
                <span class="skeleton-line" style="width:70%"></span>
              </div>
            </div>
          } @else if (selectedModule; as module) {
            <div class="module-detail-card" [class]="'c-' + module.color">
              <div class="module-detail-header">
                <span class="module-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    @switch (module.key) {
                      @case ('sessions') { <path d="M4 9v6M2 10v4M22 10v4M20 9v6M7 8v8M17 8v8M7 12h10"/> }
                      @case ('calendar') { <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/> }
                      @case ('participations') { <circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/> }
                      @case ('performances') { <path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/> }
                      @case ('goals') { <circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none"/> }
                      @case ('programs') { <rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8 11h8M8 15h8M8 19h4"/> }
                      @case ('journal') { <path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h5"/> }
                      @case ('notifications') { <path d="M6 10a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/> }
                      @case ('athletes') { <circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.3 2.9-6 5.5-6s5.5 2.7 5.5 6"/><circle cx="17.5" cy="9" r="2.3"/><path d="M15.2 20c.2-2.4 1.9-4.5 4.8-4.5"/> }
                      @case ('workout-new') { <circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/> }
                    }
                  </svg>
                </span>
                <div>
                  <p class="eyebrow">MODULE</p>
                  <h2>{{ module.title }}</h2>
                </div>
                @if (module.key === 'sessions' && (stats$ | async); as stats) {
                  <span class="module-badge">{{ stats.upcoming_sessions }} à venir</span>
                }
                @if (module.key === 'performances' && (stats$ | async); as stats) {
                  <span class="module-badge">{{ stats.total_performances }} enregistrées</span>
                }
                @if (module.key === 'participations' && (stats$ | async); as stats) {
                  <span class="module-badge">{{ stats.attended_sessions }}/{{ stats.total_participations }} suivies</span>
                }
                @if (module.key === 'goals' && (goals$ | async); as goals) {
                  <span class="module-badge">{{ goals.length }} objectif{{ goals.length > 1 ? 's' : '' }}</span>
                }
                @if (module.key === 'programs' && (programs$ | async); as programs) {
                  <span class="module-badge">{{ programs.length }} programme{{ programs.length > 1 ? 's' : '' }}</span>
                }
                @if (module.key === 'notifications' && (unreadCount$ | async); as count) {
                  <span class="module-badge">{{ count }} non lue{{ count > 1 ? 's' : '' }}</span>
                }
                @if (module.key === 'athletes' && (athletes$ | async); as athletes) {
                  <span class="module-badge">{{ athletes.length }} suivi{{ athletes.length > 1 ? 's' : '' }}</span>
                }
              </div>

              <p class="text-secondary">{{ module.description }}</p>

              @if (module.key === 'sessions' && (upcomingSessions$ | async); as upcoming) {
                @if (upcoming.length) {
                  <span class="module-preview-list">
                    @for (session of upcoming; track session.id) {
                      <span class="module-preview-row"><span class="module-preview-row-main"><span class="module-preview-dot" aria-hidden="true"></span>{{ session.title }}</span><span class="text-secondary">{{ shortSessionDate(session.starts_at) }} · {{ session.duration_minutes }} min</span></span>
                    }
                  </span>
                } @else { <p class="empty-state module-empty">Aucune séance à venir pour le moment.</p> }
              }
              @if (module.key === 'calendar' && (upcomingSessions$ | async); as upcoming) {
                @if (upcoming.length) {
                  <span class="module-preview-list">
                    @for (session of upcoming; track session.id) {
                      <span class="module-preview-row"><span class="module-preview-row-main"><span class="module-preview-dot" aria-hidden="true"></span>{{ session.title }}</span><span class="text-secondary">{{ shortSessionDate(session.starts_at) }}</span></span>
                    }
                  </span>
                } @else { <p class="empty-state module-empty">Rien de planifié sur votre calendrier pour le moment.</p> }
              }
              @if (module.key === 'participations' && (participations$ | async); as items) {
                @if (items.length) {
                  <span class="module-preview-list">
                    @for (item of items; track item.id) {
                      <span class="module-preview-row"><span class="module-preview-row-main"><span class="module-preview-dot" aria-hidden="true"></span>{{ item.sessionTitle }}</span><span class="text-secondary">{{ statusLabel(item.status) }}</span></span>
                    }
                  </span>
                } @else { <p class="empty-state module-empty">Aucune participation récente. Inscrivez-vous à une séance pour la retrouver ici.</p> }
              }
              @if (module.key === 'performances' && (performances$ | async); as perfs) {
                @if (perfs.length) {
                  <span class="module-stat-line text-secondary">Moyenne {{ avgScore(perfs) }} pts · Dernier {{ perfs[perfs.length - 1].score }} pts</span>
                  <span class="module-sparkline" aria-hidden="true">
                    @for (bar of sparkBars(perfs); track $index) { <span [style.height.%]="bar"></span> }
                  </span>
                } @else { <p class="empty-state module-empty">Aucune performance enregistrée pour le moment.</p> }
              }
              @if (module.key === 'goals' && (goals$ | async); as goals) {
                @if (goals.length) {
                  <span class="module-preview-list">
                    @for (goal of goals.slice(0, 3); track goal.id) {
                      <span class="module-preview-goal">
                        <span class="module-preview-row-main"><span class="module-preview-dot" aria-hidden="true"></span>{{ goal.title }}</span>
                        <span class="text-secondary">{{ goal.current_value }}/{{ goal.target_value }} {{ goal.unit }} · {{ goalProgress(goal) }}%</span>
                        <span class="module-mini-progress" aria-hidden="true"><span [style.width.%]="goalProgress(goal)"></span></span>
                      </span>
                    }
                  </span>
                } @else { <p class="empty-state module-empty">Aucun objectif pour le moment. Définissez-en un pour suivre votre progression.</p> }
              }
              @if (module.key === 'programs' && (programs$ | async); as programs) {
                @if (programs.length) {
                  <span class="module-preview-list">
                    @for (program of programs; track program.id) {
                      <span class="module-preview-row"><span class="module-preview-row-main"><span class="module-preview-dot" aria-hidden="true"></span>{{ program.name }}</span><span class="text-secondary">{{ program.weeks }} semaine{{ program.weeks > 1 ? 's' : '' }}</span></span>
                    }
                  </span>
                } @else { <p class="empty-state module-empty">Aucun programme pour le moment.</p> }
              }
              @if (module.key === 'journal' && (journal$ | async); as entries) {
                @if (entries.length) {
                  <span class="module-preview-list">
                    @for (entry of entries; track entry.id) {
                      <span class="module-preview-row"><span class="module-preview-row-main"><span class="module-preview-dot" aria-hidden="true"></span>{{ entry.sessionTitle }}</span><span class="text-secondary">{{ entry.mood }} · fatigue {{ entry.fatigue }}</span></span>
                    }
                  </span>
                } @else { <p class="empty-state module-empty">Aucune entrée de journal pour le moment.</p> }
              }
              @if (module.key === 'notifications' && (notifications$ | async); as notifs) {
                @if (notifs.length) {
                  <span class="module-preview-list">
                    @for (notif of notifs.slice(0, 3); track notif.id) {
                      <span class="module-preview-row"><span class="module-preview-row-main"><span class="module-preview-dot" [class.unread]="!notif.is_read" aria-hidden="true"></span>{{ notif.title }}</span><span class="text-secondary">{{ notif.message | slice: 0:34 }}{{ notif.message.length > 34 ? '…' : '' }}</span></span>
                    }
                  </span>
                } @else { <p class="empty-state module-empty">Aucune notification pour le moment.</p> }
              }
              @if (module.key === 'athletes' && (athletes$ | async); as athletes) {
                @if (athletes.length) {
                  <span class="module-preview-list">
                    @for (athlete of athletes; track athlete.id) {
                      <span class="module-preview-row"><span class="module-preview-row-main"><span class="module-preview-dot" aria-hidden="true"></span>{{ athlete.full_name }}</span><span class="text-secondary">{{ athlete.email }}</span></span>
                    }
                  </span>
                } @else { <p class="empty-state module-empty">Aucun sportif suivi pour le moment.</p> }
              }

              <a class="module-detail-cta" [routerLink]="module.link">Ouvrir {{ module.title }} →</a>
            </div>
          }
        </div>
      </div>
    </section>
  `
})
/** Compose les flux réactifs de chaque module et pilote le module actuellement sélectionné. */
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  readonly stats$ = inject(StatisticsService).mine().pipe(shareReplay({ bufferSize: 1, refCount: true }));
  readonly user$ = inject(UserService).me();
  readonly performances$ = inject(PerformanceService).list().pipe(shareReplay({ bufferSize: 1, refCount: true }));
  readonly goals$ = inject(GoalService).goals().pipe(shareReplay({ bufferSize: 1, refCount: true }));
  readonly notifications$ = inject(NotificationService).list().pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly unreadCount$ = this.notifications$.pipe(
    map((notifications) => notifications.filter((notification) => !notification.is_read).length)
  );
  readonly tagline$ = combineLatest([this.stats$, this.goals$]).pipe(
    map(([stats, goals]) => this.computeTagline(stats.upcoming_sessions, goals))
  );

  private readonly allSessions$ = inject(SessionService).list().pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );
  private readonly sessions$ = this.allSessions$.pipe(
    map((sessions) => sessions
      .filter((session) => new Date(session.starts_at) > new Date())
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly nextSession$ = this.sessions$.pipe(map((sessions) => sessions[0]));
  readonly upcomingSessions$ = this.sessions$.pipe(map((sessions) => sessions.slice(0, 3)));

  readonly participations$ = combineLatest([inject(ParticipationService).list(), this.allSessions$]).pipe(
    map(([participations, sessions]) => participations
      .slice(-3)
      .reverse()
      .map((participation) => ({
        ...participation,
        sessionTitle: sessions.find((session) => session.id === participation.session_id)?.title ?? 'Séance',
      }))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly programs$ = inject(ProgramService).list().pipe(
    map((programs) => [...programs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly journal$ = combineLatest([inject(JournalService).list(), this.allSessions$]).pipe(
    map(([entries, sessions]) => [...entries]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .map((entry) => ({
        ...entry,
        sessionTitle: sessions.find((session) => session.id === entry.session_id)?.title ?? 'Séance',
      }))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Réservé aux coachs/admins : le backend rejette /users/athletes (403) pour un sportif.
  readonly athletes$ = this.auth.isCoachOrAdmin()
    ? inject(UserService).athletes().pipe(map((athletes) => athletes.slice(0, 3)), shareReplay({ bufferSize: 1, refCount: true }))
    : of([]);

  /** Prêt une fois que les données du module actuellement affiché ont eu le temps d'arriver au moins une fois. */
  readonly ready$ = combineLatest([
    this.stats$, this.goals$, this.performances$, this.participations$,
    this.programs$, this.journal$, this.notifications$, this.athletes$, this.sessions$
  ]).pipe(map(() => true), shareReplay({ bufferSize: 1, refCount: true }));

  selectedKey = 'sessions';

  /** Modules affichés dans le rail : modules communs, plus modules coach si le rôle le permet. */
  get modules(): DashboardModule[] {
    return this.auth.isCoachOrAdmin() ? [...MODULES, ...COACH_MODULES] : MODULES;
  }

  get selectedModule(): DashboardModule | undefined {
    return this.modules.find((module) => module.key === this.selectedKey) ?? this.modules[0];
  }

  selectModule(key: string): void {
    this.selectedKey = key;
  }

  firstName(fullName: string): string {
    return fullName.split(' ')[0] || fullName;
  }

  /** Places encore disponibles pour une séance (jamais négatif). */
  remainingSpots(session: SportSession): number {
    return Math.max(0, session.capacity - session.registered_count);
  }

  /** Date complète en français avec majuscule initiale (ex. "Lundi 15 septembre, 18:00"). */
  formatSessionDate(iso: string): string {
    const formatted = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  /** Date courte utilisée dans les aperçus de liste (ex. "15/09, 18:00"). */
  shortSessionDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  /** Hauteurs (%) des barres du mini-graphique de performances, sur les 6 derniers scores. */
  sparkBars(items: { score: number }[]): number[] {
    const recent = items.slice(-6);
    return recent.map((item) => Math.max(8, Math.min(100, item.score)));
  }

  avgScore(items: { score: number }[]): number {
    return Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
  }

  /** Pourcentage de progression d'un objectif, plafonné à 100 %. */
  goalProgress(goal: { current_value: number; target_value: number }): number {
    if (!goal.target_value) { return 0; }
    return Math.round(Math.min(100, (goal.current_value / goal.target_value) * 100));
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Message d'accroche affiché sous le titre : priorité à un objectif dont
   * l'échéance est dans les 7 jours, sinon rappel du nombre de séances à venir.
   */
  private computeTagline(upcomingSessions: number, goals: { title: string; due_date?: string }[]): string {
    const now = new Date();
    const nearestGoal = goals
      .filter((goal) => goal.due_date && new Date(goal.due_date) >= now)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0];

    if (nearestGoal) {
      const days = Math.ceil((new Date(nearestGoal.due_date!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 7) {
        const when = days === 0 ? 'aujourd’hui' : days === 1 ? 'demain' : `dans ${days} jours`;
        return `Objectif « ${nearestGoal.title} » ${when} !`;
      }
    }

    if (upcomingSessions > 0) {
      return `${upcomingSessions} séance${upcomingSessions > 1 ? 's' : ''} à venir, continue comme ça !`;
    }

    return 'Choisissez un module pour continuer votre entraînement.';
  }
}
