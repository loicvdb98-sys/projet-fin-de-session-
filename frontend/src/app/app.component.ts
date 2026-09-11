import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar class="app-header">
      <a class="brand" routerLink="/dashboard" aria-label="SportPlan - tableau de bord">
        <span class="brand-mark">S</span><span>SportPlan</span>
      </a>
      <nav>
        <a mat-button routerLink="/dashboard">Tableau de bord</a>
        <a mat-button routerLink="/sessions">Séances</a>
        @if (auth.isAuthenticated()) {
          <a mat-button routerLink="/workouts/new">Créer</a>
        }
        <a mat-button routerLink="/calendar">Calendrier</a>
        @if (auth.isAuthenticated()) {
          <a mat-button routerLink="/participations">Participations</a>
          <a mat-button routerLink="/performances">Statistiques</a>
          <a mat-button routerLink="/goals">Objectifs</a>
          <a mat-button routerLink="/programs">Programmes</a>
          <a mat-button routerLink="/notifications">Alertes</a>
          <a mat-button routerLink="/athletes">Sportifs</a>
          <a mat-button routerLink="/profile">Profil</a>
        }
        @if (auth.isAuthenticated()) {
          <button mat-button (click)="auth.logout()">Déconnexion</button>
        } @else {
          <a mat-button routerLink="/login">Connexion</a>
        }
        <button mat-icon-button class="theme-toggle" (click)="theme.toggle()"
          [attr.aria-label]="theme.theme() === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair'"
          [attr.title]="theme.theme() === 'light' ? 'Thème sombre' : 'Thème clair'">
          <span aria-hidden="true">{{ theme.theme() === 'light' ? '☾' : '☀' }}</span>
        </button>
      </nav>
    </mat-toolbar>
    <main><router-outlet /></main>
  `
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
}
