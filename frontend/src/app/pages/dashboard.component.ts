import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { map, shareReplay } from 'rxjs';
import { StatisticsService } from '../services/statistics.service';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { SessionService } from '../services/session.service';
import { PerformanceService } from '../services/performance.service';
import { DEMO_MODE } from '../demo-data';

type ModuleColor = 'primary' | 'secondary' | 'success' | 'warning' | 'info';
type SectionKey = 'today' | 'progress' | 'organize' | 'coaching';
interface DashboardModule { key: string; title: string; description: string; link: string; color: ModuleColor; section: SectionKey; size?: 'lg'; }
interface ModuleSection { key: SectionKey; eyebrow: string; title: string; items: DashboardModule[]; }

const SECTION_INFO: Record<SectionKey, { eyebrow: string; title: string }> = {
  today: { eyebrow: 'AUJOURD’HUI', title: 'Suivi du jour' },
  progress: { eyebrow: 'PROGRESSION', title: 'Progression' },
  organize: { eyebrow: 'ORGANISATION', title: 'Organisation' },
  coaching: { eyebrow: 'ESPACE COACH', title: 'Coaching' },
};

const MODULES: DashboardModule[] = [
  { key: 'sessions', title: 'Séances', description: 'Consultez et gérez vos séances d’entraînement.', link: '/sessions', color: 'secondary', section: 'today', size: 'lg' },
  { key: 'calendar', title: 'Calendrier', description: 'Visualisez votre planning à venir.', link: '/calendar', color: 'info', section: 'today' },
  { key: 'participations', title: 'Participations', description: 'Suivez vos inscriptions aux séances.', link: '/participations', color: 'success', section: 'today' },
  { key: 'performances', title: 'Performances', description: 'Analysez vos résultats et votre progression.', link: '/performances', color: 'primary', section: 'progress', size: 'lg' },
  { key: 'goals', title: 'Objectifs', description: 'Définissez vos cibles et records personnels.', link: '/goals', color: 'warning', section: 'progress' },
  { key: 'programs', title: 'Programmes', description: 'Suivez vos programmes d’entraînement.', link: '/programs', color: 'secondary', section: 'organize' },
  { key: 'journal', title: 'Journal', description: 'Consignez vos ressentis après chaque séance.', link: '/journal', color: 'info', section: 'organize' },
  { key: 'notifications', title: 'Notifications', description: 'Restez informé des dernières alertes.', link: '/notifications', color: 'warning', section: 'organize' },
];

const COACH_MODULES: DashboardModule[] = [
  { key: 'athletes', title: 'Sportifs', description: 'Suivez vos athlètes et leur progression.', link: '/athletes', color: 'primary', section: 'coaching' },
  { key: 'workout-new', title: 'Créer une séance', description: 'Composez un nouvel entraînement.', link: '/workouts/new', color: 'success', section: 'coaching' },
];

@Component({
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  template: `
    <section class="page home-page">
      @if (demoMode) { <div class="demo-banner"><strong>Mode démonstration</strong><span>Données locales temporaires affichées pour la présentation.</span></div> }
      <div class="home-hero">
        <div>
          <p class="eyebrow">VOTRE ESPACE SPORTIF</p>
          @if (user$ | async; as user) { <h1>Bonjour {{ firstName(user.full_name) }}</h1> } @else { <h1>Bonjour</h1> }
          <p class="text-secondary">Choisissez un module pour continuer votre entraînement.</p>
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
            <span class="text-secondary">{{ formatSessionDate(next.starts_at) }} · {{ next.duration_minutes }} min</span>
          </span>
          <span class="next-session-cta">Voir →</span>
        </a>
      } @else {
        <div class="next-session-card empty">
          <span class="text-secondary">Aucune séance à venir pour le moment.</span>
          <a routerLink="/sessions" class="next-session-cta">Voir les séances →</a>
        </div>
      }

      @for (section of sections; track section.key) {
        <div class="module-heading"><p class="eyebrow">{{ section.eyebrow }}</p><h2>{{ section.title }}</h2></div>
        <div class="module-grid home-modules">
          @for (module of section.items; track module.link) {
            <a class="module-card" [class]="'c-' + module.color + (module.size === 'lg' ? ' size-lg' : '')" [routerLink]="module.link">
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
              <span class="module-card-body">
                <span class="module-card-title-row">
                  <strong>{{ module.title }}</strong>
                  @if (module.key === 'sessions' && (stats$ | async); as stats) {
                    <span class="module-badge">{{ stats.upcoming_sessions }} à venir</span>
                  }
                  @if (module.key === 'performances' && (stats$ | async); as stats) {
                    <span class="module-badge">{{ stats.total_performances }} enregistrées</span>
                  }
                </span>
                <span class="text-secondary">{{ module.description }}</span>

                @if (module.key === 'sessions' && (upcomingSessions$ | async); as upcoming) {
                  @if (upcoming.length) {
                    <span class="module-preview-list">
                      @for (session of upcoming; track session.id) {
                        <span class="module-preview-row"><span>{{ session.title }}</span><span class="text-secondary">{{ shortSessionDate(session.starts_at) }}</span></span>
                      }
                    </span>
                  }
                }
                @if (module.key === 'performances' && (performances$ | async); as perfs) {
                  @if (perfs.length) {
                    <span class="module-sparkline" aria-hidden="true">
                      @for (bar of sparkBars(perfs); track $index) { <span [style.height.%]="bar"></span> }
                    </span>
                  }
                }
              </span>
            </a>
          }
        </div>
      }
    </section>
  `
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  readonly demoMode = DEMO_MODE;
  readonly stats$ = inject(StatisticsService).mine();
  readonly user$ = inject(UserService).me();
  readonly performances$ = inject(PerformanceService).list();

  private readonly sessions$ = inject(SessionService).list().pipe(
    map((sessions) => sessions
      .filter((session) => new Date(session.starts_at) > new Date())
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly nextSession$ = this.sessions$.pipe(map((sessions) => sessions[0]));
  readonly upcomingSessions$ = this.sessions$.pipe(map((sessions) => sessions.slice(0, 3)));

  get modules(): DashboardModule[] {
    return this.auth.isCoachOrAdmin() ? [...MODULES, ...COACH_MODULES] : MODULES;
  }

  get sections(): ModuleSection[] {
    const bySection = new Map<SectionKey, DashboardModule[]>();
    for (const module of this.modules) {
      const items = bySection.get(module.section) ?? [];
      items.push(module);
      bySection.set(module.section, items);
    }
    return Array.from(bySection.entries()).map(([key, items]) => ({ key, items, ...SECTION_INFO[key] }));
  }

  firstName(fullName: string): string {
    return fullName.split(' ')[0] || fullName;
  }

  formatSessionDate(iso: string): string {
    const formatted = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  shortSessionDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  sparkBars(items: { score: number }[]): number[] {
    const recent = items.slice(-6);
    return recent.map((item) => Math.max(8, Math.min(100, item.score)));
  }
}
