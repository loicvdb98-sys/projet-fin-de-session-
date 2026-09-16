import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { StatisticsService } from '../services/statistics.service';
import { AuthService } from '../services/auth.service';
import { DEMO_MODE } from '../demo-data';

interface DashboardModule { title: string; description: string; icon: string; link: string; }

const MODULES: DashboardModule[] = [
  { title: 'Séances', description: 'Consultez et gérez vos séances d’entraînement.', icon: '🗓️', link: '/sessions' },
  { title: 'Calendrier', description: 'Visualisez votre planning à venir.', icon: '📆', link: '/calendar' },
  { title: 'Participations', description: 'Suivez vos inscriptions aux séances.', icon: '✅', link: '/participations' },
  { title: 'Performances', description: 'Analysez vos résultats et votre progression.', icon: '📈', link: '/performances' },
  { title: 'Objectifs', description: 'Définissez vos cibles et records personnels.', icon: '🎯', link: '/goals' },
  { title: 'Programmes', description: 'Suivez vos programmes d’entraînement.', icon: '📋', link: '/programs' },
  { title: 'Journal', description: 'Consignez vos ressentis après chaque séance.', icon: '📝', link: '/journal' },
  { title: 'Notifications', description: 'Restez informé des dernières alertes.', icon: '🔔', link: '/notifications' },
];

const COACH_MODULES: DashboardModule[] = [
  { title: 'Sportifs', description: 'Suivez vos athlètes et leur progression.', icon: '👥', link: '/athletes' },
  { title: 'Créer une séance', description: 'Composez un nouvel entraînement.', icon: '➕', link: '/workouts/new' },
];

@Component({
  standalone: true,
  imports: [AsyncPipe, MatCardModule, MatButtonModule, RouterLink],
  template: `
    <section class="page">
      @if (demoMode) { <div class="demo-banner"><strong>Mode démonstration</strong><span>Données locales temporaires affichées pour la présentation.</span></div> }
      <div class="page-heading"><div><p class="eyebrow">VOTRE ESPACE SPORTIF</p><h1>Tableau de bord</h1><p class="text-secondary">Gardez le rythme et suivez votre progression.</p></div><span class="status-badge success"><span aria-hidden="true">●</span> Actif</span></div>
      <div class="cards">
        @if (stats$ | async; as stats) {
          <mat-card class="stat-card accent"><mat-card-header><mat-card-title>Prochaines séances</mat-card-title></mat-card-header><mat-card-content><strong class="stat-value">{{ stats.upcoming_sessions }}</strong><p class="text-secondary">Séances à venir.</p></mat-card-content><mat-card-actions><a mat-button class="teal-action" routerLink="/sessions">Voir les séances →</a></mat-card-actions></mat-card>
          <mat-card class="stat-card"><mat-card-header><mat-card-title>Progression</mat-card-title></mat-card-header><mat-card-content><strong class="stat-value">{{ stats.attended_sessions }}</strong><p class="text-secondary">Séances suivies · {{ stats.total_performances }} performances</p></mat-card-content></mat-card>
        } @else {
          <mat-card class="stat-card accent"><mat-card-title>Prochaines séances</mat-card-title><mat-card-content><strong class="stat-value">—</strong><p class="text-secondary">Connectez-vous pour voir vos données.</p></mat-card-content></mat-card>
        }
      </div>
      <mat-card class="insight-card"><mat-card-header><mat-card-title>Votre régularité</mat-card-title></mat-card-header><mat-card-content><div class="chart-placeholder"><span style="height:35%"></span><span style="height:55%"></span><span style="height:45%"></span><span style="height:75%"></span><span style="height:60%"></span><span style="height:90%"></span><span style="height:70%"></span></div><p class="text-secondary">Ajoutez des séances pour visualiser votre activité.</p></mat-card-content></mat-card>

      <div class="module-heading"><p class="eyebrow">ACCÈS RAPIDE</p><h2>Vos modules</h2></div>
      <div class="module-grid">
        @for (module of modules; track module.link) {
          <a class="module-card" [routerLink]="module.link">
            <span class="module-icon" aria-hidden="true">{{ module.icon }}</span>
            <span class="module-card-body"><strong>{{ module.title }}</strong><span class="text-secondary">{{ module.description }}</span></span>
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
