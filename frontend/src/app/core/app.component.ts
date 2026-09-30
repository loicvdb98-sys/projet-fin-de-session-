/**
 * Composant racine de l'application : affiche la coquille (rail de navigation,
 * bascule de thème, déconnexion) et l'`<router-outlet>` qui charge chaque écran.
 */
import { Component, Injector, afterNextRender, effect, inject, signal } from '@angular/core';
import { AsyncPipe, DOCUMENT } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, forkJoin, merge, of, shareReplay, switchMap } from 'rxjs';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@features/auth/auth.service';
import { UserService } from '@features/athletes/user.service';
import { SessionService } from '@features/sessions/session.service';
import { ParticipationService } from '@features/participations/participation.service';
import { ThemeService } from '@shared/services/theme.service';
import { ToastService } from '@shared/services/toast.service';
import { ToastContainerComponent } from '@shared/components/toast-container.component';
import { NotificationService } from '@features/notifications/notification.service';

/** Fenêtre avant le début d'une séance pendant laquelle un rappel est affiché. */
const REMINDER_WINDOW_MS = 3 * 60 * 60 * 1000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, ToastContainerComponent],
  host: { '(document:keydown.escape)': 'closeMenu(true)' },
  template: `
    <a class="skip-link" href="#contenu" (click)="skipToContent($event)">Aller au contenu</a>
    <div class="app-shell">
      <aside id="app-menu" class="app-rail" [class.menu-open]="menuOpen()" [class.dense]="auth.isAuthenticated() && auth.isCoachOrAdmin()" aria-label="Navigation principale">
        <div class="app-rail-top">
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
          <button type="button" class="app-menu-toggle" [class.has-unread]="notifications.unreadCount() > 0" (click)="menuOpen.set(!menuOpen())"
            aria-controls="app-menu" [attr.aria-expanded]="menuOpen()" [attr.aria-label]="menuOpen() ? 'Fermer le menu' : 'Ouvrir le menu'">
            @if (menuOpen()) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            }
          </button>
        </div>

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
          <a class="app-rail-item" title="Tableau de bord" routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l8-8 8 8"/><path d="M6 10v10h5v-6h2v6h5V10"/></svg></span>
            <span class="app-rail-label">Tableau de bord</span>
          </a>

          <p class="app-rail-section">Planning</p>
          <a class="app-rail-item" title="Séances" routerLink="/sessions" routerLinkActive="active">
            <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6M2 10v4M22 10v4M20 9v6M7 8v8M17 8v8M7 12h10"/></svg></span>
            <span class="app-rail-label">Séances</span>
          </a>
          @if (auth.isAuthenticated() && auth.isCoachOrAdmin()) {
            <a class="app-rail-item" title="Créer" routerLink="/workouts/new" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></span>
              <span class="app-rail-label">Créer</span>
            </a>
          }
          <a class="app-rail-item" title="Calendrier" routerLink="/calendar" routerLinkActive="active">
            <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></span>
            <span class="app-rail-label">Calendrier</span>
          </a>

          @if (auth.isAuthenticated()) {
            <p class="app-rail-section">Suivi</p>
            <a class="app-rail-item" title="Participations" routerLink="/participations" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></svg></span>
              <span class="app-rail-label">Participations</span>
            </a>
            <a class="app-rail-item" title="Statistiques" routerLink="/performances" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/></svg></span>
              <span class="app-rail-label">Statistiques</span>
            </a>
            <a class="app-rail-item" title="Objectifs" routerLink="/goals" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none"/></svg></span>
              <span class="app-rail-label">Objectifs</span>
            </a>
            <a class="app-rail-item" title="Journal" routerLink="/journal" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h5"/></svg></span>
              <span class="app-rail-label">Journal</span>
            </a>

            <p class="app-rail-section">Ressources</p>
            <a class="app-rail-item" title="Programmes" routerLink="/programs" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8 11h8M8 15h8M8 19h4"/></svg></span>
              <span class="app-rail-label">Programmes</span>
            </a>
            <a class="app-rail-item" title="Notifications" routerLink="/notifications" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg></span>
              <span class="app-rail-label">Notifications</span>
              @if (notifications.unreadCount(); as unread) { <span class="app-rail-badge" [attr.aria-label]="unread + ' notification(s) non lue(s)'">{{ unread }}</span> }
            </a>

            @if (auth.isCoachOrAdmin()) {
              <p class="app-rail-section">Équipe</p>
              <a class="app-rail-item" title="Sportifs" routerLink="/athletes" routerLinkActive="active">
                <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.3 2.9-6 5.5-6s5.5 2.7 5.5 6"/><circle cx="17.5" cy="9" r="2.3"/><path d="M15.2 20c.2-2.4 1.9-4.5 4.8-4.5"/></svg></span>
                <span class="app-rail-label">Sportifs</span>
              </a>
              @if (auth.isAdmin()) {
                <a class="app-rail-item" title="Comptes" routerLink="/admin/users" routerLinkActive="active">
                  <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2.4"/></svg></span>
                  <span class="app-rail-label">Comptes</span>
                </a>
              }
            }

            <p class="app-rail-section">Compte</p>
            <a class="app-rail-item" title="Profil" routerLink="/profile" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/></svg></span>
              <span class="app-rail-label">Profil</span>
            </a>
          }
        </nav>

        <div class="app-rail-footer">
          @if (auth.isAuthenticated()) {
            <button type="button" class="app-rail-item" title="Déconnexion" (click)="auth.logout()">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></span>
              <span class="app-rail-label">Déconnexion</span>
            </button>
          } @else {
            <a class="app-rail-item" title="Connexion" routerLink="/login" routerLinkActive="active">
              <span class="app-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg></span>
              <span class="app-rail-label">Connexion</span>
            </a>
          }
          <button type="button" class="app-rail-item theme-toggle" (click)="theme.toggle()" [attr.title]="theme.theme() === 'light' ? 'Thème sombre' : 'Thème clair'"
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

      <!-- Menu mobile ouvert : la page en dessous est retirée du clavier et des lecteurs d'écran (inert). -->
      <main id="contenu" tabindex="-1" [attr.inert]="menuOpen() ? '' : null"><router-outlet /></main>
    </div>
    <app-toasts />
  `
})
/** Coquille applicative : navigation latérale et toasts sont montés ici une seule fois. */
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly users = inject(UserService);
  private readonly sessions = inject(SessionService);
  private readonly participations = inject(ParticipationService);
  private readonly toast = inject(ToastService);
  readonly notifications = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  /** Menu de navigation déplié (affichage mobile uniquement). */
  readonly menuOpen = signal(false);
  /** Faux jusqu'à la première navigation : le focus n'est pas déplacé au chargement initial. */
  private hasNavigated = false;

  // Recharge le profil à chaque bascule de connexion/déconnexion (le shell n'est monté qu'une fois),
  // et le met à jour quand l'utilisateur modifie son profil (nom affiché dans le menu).
  readonly currentUser$ = merge(
    toObservable(this.auth.isAuthenticated).pipe(switchMap((isAuthenticated) => (isAuthenticated ? this.users.me() : of(null)))),
    this.users.currentUserChanged$
  ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  constructor() {
    // Referme le menu mobile après chaque navigation, et rafraîchit le compteur de
    // notifications non lues (de nouvelles peuvent arriver quand une séance change).
    inject(Router).events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen.set(false);
      const moveFocus = this.hasNavigated;
      this.hasNavigated = true;
      afterNextRender(() => {
        // Garde l'entrée active visible dans le menu quand celui-ci doit défiler (petits écrans).
        this.document.querySelector('.app-rail-nav .app-rail-item.active')?.scrollIntoView({ block: 'nearest' });
        if (moveFocus) this.focusPageHeading();
      }, { injector: this.injector });
      if (this.auth.isAuthenticated()) this.notifications.refreshUnreadCount();
      else this.notifications.unreadCount.set(0);
    });
    // Rappels vérifiés une fois par connexion (pas à chaque modification du profil).
    this.currentUser$.pipe(distinctUntilChanged((previous, next) => previous?.id === next?.id)).subscribe((user) => {
      if (user?.role === 'sportif') this.checkUpcomingReminders(user.id);
    });
    // Menu ouvert : la page en dessous ne défile plus (classe posée sur <html>).
    effect(() => this.document.documentElement.classList.toggle('menu-lock', this.menuOpen()));
    // Passage en affichage large (rotation d'une tablette, dépliage d'un pliable) : le menu
    // plein écran n'a plus lieu d'être, et <main> ne doit pas rester inerte.
    window.matchMedia('(min-width: 901px)').addEventListener('change', (query) => { if (query.matches) this.menuOpen.set(false); });
  }

  /** Touche Échap : referme le menu mobile et rend le focus au bouton qui l'a ouvert. */
  closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (restoreFocus) this.document.querySelector<HTMLElement>('.app-menu-toggle')?.focus();
  }

  /** Lien d'évitement : place le focus au début du contenu sans changer l'URL. */
  skipToContent(event: Event): void {
    event.preventDefault();
    this.closeMenu();
    this.focusPageHeading();
  }

  /**
   * Après un changement de page, place le focus sur le titre principal : les lecteurs
   * d'écran annoncent la nouvelle page, et la touche Tab repart du contenu plutôt que
   * d'un lien du menu (qui, sur mobile, vient d'être masqué).
   */
  private focusPageHeading(): void {
    const main = this.document.getElementById('contenu');
    const target = main?.querySelector<HTMLElement>('h1') ?? main;
    if (!target) return;
    if (target !== main) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
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
