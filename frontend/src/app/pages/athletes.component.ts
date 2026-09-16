import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { DEMO_MODE } from '../demo-data';
import { User, UserService } from '../services/user.service';

@Component({
  standalone: true,
  imports: [AsyncPipe, MatCardModule, MatButtonModule, RouterLink],
  template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">ESPACE COACH</p>
          <h1>Mes sportifs</h1>
          <p class="text-secondary">Retrouvez les sportifs actifs et accédez rapidement à leur suivi.</p>
        </div>
      </div>

      @if (demoMode) {
        <div class="demo-banner">
          <strong>Mode démonstration</strong>
          <span>Profils fictifs affichés pour rendre la page plus visuelle pendant l'oral.</span>
        </div>
      }

      @if (athletes$ | async; as athletes) {
        <div class="athlete-grid">
          @for (athlete of athletes; track athlete.id) {
            <mat-card class="athlete-card">
              <div class="profile-avatar small-avatar" aria-hidden="true">{{ initials(athlete.full_name) }}</div>
              <div>
                <h2>{{ athlete.full_name }}</h2>
                <p class="text-secondary">{{ athlete.specialty || athlete.email }}</p>
                <span class="status-badge success">Actif</span>
              </div>

              <div class="athlete-details">
                <div>
                  <small>Objectif actuel</small>
                  <strong>{{ athlete.goal || 'Objectif à définir' }}</strong>
                </div>
                <div class="athlete-stat">
                  <span><small>Séances / semaine</small><strong>{{ athlete.weekly_sessions ?? 0 }}</strong></span>
                  <span><small>Dernière activité</small><strong>{{ athlete.last_activity || '—' }}</strong></span>
                </div>
                <div class="goal-progress"><span [style.width.%]="athlete.progress ?? 0"></span></div>
                <small class="progress-label">Progression : {{ athlete.progress ?? 0 }} %</small>
              </div>

              <a mat-stroked-button [routerLink]="['/athletes', athlete.id]">Voir le suivi</a>
            </mat-card>
          } @empty {
            <mat-card class="empty-state-card"><h2>Aucun sportif</h2><p class="text-secondary">Les sportifs inscrits apparaîtront ici.</p></mat-card>
          }
        </div>
      }
    </section>
  `
})
export class AthletesComponent {
  readonly athletes$ = inject(UserService).athletes();
  readonly demoMode = DEMO_MODE;

  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
  }
}
