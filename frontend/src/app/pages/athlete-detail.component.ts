import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DEMO_ATHLETES } from '../demo-data';

@Component({
  standalone: true,
  imports: [MatButtonModule, MatCardModule, RouterLink],
  template: `
    <section class="page">
      @if (athlete) {
        <a mat-button class="teal-action back-link" routerLink="/athletes">← Retour aux sportifs</a>
        <div class="page-heading athlete-detail-heading">
          <div class="profile-avatar" aria-hidden="true">{{ initials(athlete.full_name) }}</div>
          <div><p class="eyebrow">SUIVI INDIVIDUEL</p><h1>{{ athlete.full_name }}</h1><p class="text-secondary">{{ athlete.specialty }} · {{ athlete.email }}</p></div>
          <span class="status-badge success">Actif</span>
        </div>

        <div class="cards athlete-overview">
          <mat-card class="stat-card accent"><mat-card-title>Progression</mat-card-title><strong class="stat-value">{{ athlete.progress }} %</strong><p class="text-secondary">vers l'objectif défini</p></mat-card>
          <mat-card class="stat-card"><mat-card-title>Rythme</mat-card-title><strong class="stat-value">{{ athlete.weekly_sessions }}</strong><p class="text-secondary">séances par semaine</p></mat-card>
          <mat-card class="stat-card"><mat-card-title>Dernière activité</mat-card-title><strong class="activity-value">{{ athlete.last_activity }}</strong><p class="text-secondary">sportif actif</p></mat-card>
        </div>

        <div class="athlete-followup-grid">
          <mat-card><p class="eyebrow">OBJECTIF ACTUEL</p><h2>{{ athlete.goal }}</h2><div class="goal-progress large-progress"><span [style.width.%]="athlete.progress"></span></div><p class="text-secondary">{{ athlete.progress }} % réalisé — objectif suivi par le coach.</p></mat-card>
          <mat-card><p class="eyebrow">ÉVOLUTION RÉCENTE</p><h2>Progression sur 5 séances</h2><div class="mini-chart">@for (score of scores; track $index) { <div><span [style.height.%]="score"></span><small>S{{ $index + 1 }}</small></div> }</div><p class="text-secondary">Tendance positive sur les dernières séances.</p></mat-card>
        </div>
      } @else {
        <mat-card class="empty-state-card"><h2>Sportif introuvable</h2><a mat-stroked-button routerLink="/athletes">Retour aux sportifs</a></mat-card>
      }
    </section>
  `
})
export class AthleteDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly athlete = DEMO_ATHLETES.find(item => item.id === Number(this.route.snapshot.paramMap.get('id')));
  readonly scores = this.athlete?.id === 402 ? [46, 55, 61, 64, 68] : this.athlete?.id === 403 ? [62, 70, 76, 85, 91] : [55, 64, 70, 76, 82];

  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
  }
}
