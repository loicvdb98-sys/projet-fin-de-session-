/**
 * Composant racine de l'application : affiche la coquille (rail de navigation,
 * bascule de thème, déconnexion) et l'`<router-outlet>` qui charge chaque écran.
 */
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { forkJoin, of, shareReplay, switchMap } from 'rxjs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@features/auth/auth.service';
import { UserService } from '@features/athletes/user.service';
import { SessionService } from '@features/sessions/session.service';
import { ParticipationService } from '@features/participations/participation.service';
import { ThemeService } from '@shared/services/theme.service';
import { ToastService } from '@shared/services/toast.service';
import { ToastContainerComponent } from '@shared/components/toast-container.component';
import { DemoNoticeComponent } from '@shared/components/demo-notice.component';

/** Fenêtre avant le début d'une séance pendant laquelle un rappel est affiché. */
const REMINDER_WINDOW_MS = 3 * 60 * 60 * 1000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, ToastContainerComponent, DemoNoticeComponent],
  template: `
    <div class="app-shell">
      <aside class="app-rail" aria-label="Navigation principale">
        <a class="app-rail-brand" routerLink="/dashboard" aria-label="SportPlan - tableau de bord">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 22 22" fill="currentColor">
              <rect x="4" y="12" width="3.2" height="6" rx="1.6"/>
              <rect x="9.4" y="8" width="3.2" height="10" rx="1.6"/>
              <rect x="14.8" y="4" width="3.2" height="14" rx="1.6"/>
              <circle cx="16.4" cy="2.1" r="1.3"/>
            </svg>
          </span>
          <span>SportPlan</span>
        </a>

        @if (currentUser$ | async; as me) {
          <div class="app-rail-user">
            <div class="profile-avatar rail-avatar" aria-hidden="true">{{ initials(me.full_name) }}</div>
            <div class="app-rail-user-info">
              <strong>{{ me.full_name }}</strong>
              <span class="role-badge" [class]="'role-' + me.role">{{ roleLabel(me.role) }}</span>
            </div>
          </div>
        }

        <nav class="app-rail-nav">
          <a class="app-rail-item" routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l8-8 8 8"/><path d="M6 10v10h5v-6h2v6h5V10"/></svg></span>
            <span class="app-rail-label">Tableau de bord</span>
          </a>
          <a class="app-rail-item" routerLink="/sessions" routerLinkActive="active">
            <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6M2 10v4M22 10v4M20 9v6M7 8v8M17 8v8M7 12h10"/></svg></span>
            <span class="app-rail-label">Séances</span>
          </a>
          @if (auth.isAuthenticated() && auth.isCoachOrAdmin()) {
            <a class="app-rail-item" routerLink="/workouts/new" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></span>
              <span class="app-rail-label">Créer</span>
            </a>
          }
          <a class="app-rail-item" routerLink="/calendar" routerLinkActive="active">
            <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></span>
            <span class="app-rail-label">Calendrier</span>
          </a>
          @if (auth.isAuthenticated()) {
            <a class="app-rail-item" routerLink="/participations" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></svg></span>
              <span class="app-rail-label">Participations</span>
            </a>
            <a class="app-rail-item" routerLink="/performances" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/></svg></span>
              <span class="app-rail-label">Statistiques</span>
            </a>
            <a class="app-rail-item" routerLink="/goals" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none"/></svg></span>
              <span class="app-rail-label">Objectifs</span>
            </a>
            <a class="app-rail-item" routerLink="/programs" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8 11h8M8 15h8M8 19h4"/></svg></span>
              <span class="app-rail-label">Programmes</span>
            </a>
            <a class="app-rail-item" routerLink="/notifications" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg></span>
              <span class="app-rail-label">Alertes</span>
            </a>
            @if (auth.isCoachOrAdmin()) {
              <a class="app-rail-item" routerLink="/athletes" routerLinkActive="active">
                <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.3 2.9-6 5.5-6s5.5 2.7 5.5 6"/><circle cx="17.5" cy="9" r="2.3"/><path d="M15.2 20c.2-2.4 1.9-4.5 4.8-4.5"/></svg></span>
                <span class="app-rail-label">Sportifs</span>
              </a>
            }
            @if (auth.isAdmin()) {
              <a class="app-rail-item" routerLink="/admin/users" routerLinkActive="active">
                <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2.4"/></svg></span>
                <span class="app-rail-label">Comptes</span>
              </a>
            }
            <a class="app-rail-item" routerLink="/journal" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h5"/></svg></span>
              <span class="app-rail-label">Journal</span>
            </a>
            <a class="app-rail-item" routerLink="/profile" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/></svg></span>
              <span class="app-rail-label">Profil</span>
            </a>
          }
        </nav>

        <div class="app-rail-footer">
          @if (auth.isAuthenticated()) {
            <button type="button" class="app-rail-item" (click)="auth.logout()">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></span>
              <span class="app-rail-label">Déconnexion</span>
            </button>
          } @else {
            <a class="app-rail-item" routerLink="/login" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg></span>
              <span class="app-rail-label">Connexion</span>
            </a>
          }
          <button type="button" class="app-rail-item theme-toggle" (click)="theme.toggle()"
            [attr.aria-label]="theme.theme() === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair'">
            <span class="app-rail-icon" aria-hidden="true">
              @if (theme.theme() === 'light') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
              }
            </span>
            <span class="app-rail-label">{{ theme.theme() === 'light' ? 'Thème sombre' : 'Thème clair' }}</span>
          </button>
        </div>
      </aside>

      <main><router-outlet /></main>
    </div>
    <app-toasts />
    <app-demo-notice />
  `
})
/** Coquille applicative : navigation latérale, toasts et popup de mode démo sont montés ici une seule fois. */
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly users = inject(UserService);
  private readonly sessions = inject(SessionService);
  private readonly participations = inject(ParticipationService);
  private readonly toast = inject(ToastService);

  // Recharge le profil à chaque bascule de connexion/déconnexion (le shell n'est monté qu'une fois).
  // shareReplay évite un second appel à /users/me pour la vérification des rappels ci-dessous.
  readonly currentUser$ = toObservable(this.auth.isAuthenticated).pipe(
    switchMap((isAuthenticated) => (isAuthenticated ? this.users.me() : of(null))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.currentUser$.subscribe((user) => {
      if (user?.role === 'sportif') this.checkUpcomingReminders(user.id);
    });
  }

  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  roleLabel(role: string): string {
    return role === 'coach' ? 'Coach' : role === 'admin' ? 'Administrateur' : 'Sportif';
  }

  /**
   * Affiche un rappel (une seule fois par séance, via localStorage) pour chaque séance à
   * laquelle le sportif est inscrit et qui commence dans les prochaines heures.
   */
  private checkUpcomingReminders(userId: number): void {
    forkJoin([this.participations.list(), this.sessions.list()]).subscribe(([participations, sessions]) => {
      const now = Date.now();
      const upcoming = participations.filter((p) => p.user_id === userId && p.status !== 'absent');
      for (const participation of upcoming) {
        const session = sessions.find((item) => item.id === participation.session_id);
        if (!session) continue;
        const delta = new Date(session.starts_at).getTime() - now;
        if (delta <= 0 || delta > REMINDER_WINDOW_MS) continue;
        const key = `reminder_shown_${session.id}`;
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, '1');
        const hours = Math.round(delta / (60 * 60 * 1000));
        this.toast.info(`Rappel : « ${session.title} » commence ${hours <= 1 ? 'bientôt' : 'dans ' + hours + ' h'}.`);
      }
    });
  }
}
