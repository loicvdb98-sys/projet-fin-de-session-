import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { User, UserService } from '../services/user.service';

@Component({
  standalone: true,
  imports: [AsyncPipe, MatCardModule, MatButtonModule, RouterLink],
  template: `
    <section class="page">
      <div class="page-heading"><div><p class="eyebrow">ESPACE COACH</p><h1>Mes sportifs</h1><p class="text-secondary">Retrouvez les sportifs actifs et accédez rapidement à leur suivi.</p></div></div>
      @if (athletes$ | async; as athletes) {
        <div class="athlete-grid">
          @for (athlete of athletes; track athlete.id) {
            <mat-card class="athlete-card"><div class="profile-avatar small-avatar" aria-hidden="true">{{ initials(athlete.full_name) }}</div><div><h2>{{ athlete.full_name }}</h2><p class="text-secondary">{{ athlete.email }}</p><span class="status-badge success">Actif</span></div><a mat-stroked-button routerLink="/performances">Voir le suivi</a></mat-card>
          } @empty { <mat-card class="empty-state-card"><h2>Aucun sportif</h2><p class="text-secondary">Les sportifs inscrits apparaîtront ici.</p></mat-card> }
        </div>
      }
    </section>
  `
})
export class AthletesComponent {
  readonly athletes$ = inject(UserService).athletes();
  initials(name: string): string { return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join(''); }
}
