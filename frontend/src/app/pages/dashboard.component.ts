import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatisticsService } from '../services/statistics.service';
import { AuthService } from '../services/auth.service';
import { DEMO_MODE } from '../demo-data';

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

@Component({
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  template: `
    <section class="page home-page">
      @if (demoMode) { <div class="demo-banner"><strong>Mode démonstration</strong><span>Données locales temporaires affichées pour la présentation.</span></div> }
      <div class="home-hero">
        <div><p class="eyebrow">VOTRE ESPACE SPORTIF</p><h1>Bonjour</h1><p class="text-secondary">Choisissez un module pour continuer votre entraînement.</p></div>
        <span class="status-badge success"><span aria-hidden="true">●</span> Actif</span>
      </div>

      <div class="module-grid home-modules">
        @for (module of modules; track module.link) {
          <a class="module-card" [class]="'c-' + module.color" [routerLink]="module.link">
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
            </span>
          </a>
        }
      </div>
    </section>
  `
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  readonly demoMode = DEMO_MODE;
  readonly stats$ = inject(StatisticsService).mine();

  get modules(): DashboardModule[] {
    return this.auth.isCoachOrAdmin() ? [...MODULES, ...COACH_MODULES] : MODULES;
  }
}
