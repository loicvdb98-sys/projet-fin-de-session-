import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { StatisticsService } from '../services/statistics.service';
import { DEMO_MODE } from '../demo-data';

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
    </section>
  `
})
export class DashboardComponent {
  readonly demoMode = DEMO_MODE;
  readonly stats$ = inject(StatisticsService).mine();
}
