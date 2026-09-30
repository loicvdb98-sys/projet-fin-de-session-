/**
 * Page affichée pour une adresse inconnue (au lieu d'une redirection silencieuse vers le
 * tableau de bord, qui laissait croire à un bug).
 */
import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule],
  template: `
    <section class="page">
      <mat-card class="auth-card not-found-card">
        <p class="eyebrow">ERREUR 404</p>
        <h1>Page introuvable</h1>
        <p class="text-secondary">Cette adresse ne correspond à aucune page de SportPlan : le lien est peut-être incomplet ou la page a été déplacée.</p>
        <div class="form-actions">
          <a mat-flat-button class="primary-action" routerLink="/dashboard">Aller au tableau de bord</a>
          <button mat-button class="switch-auth" type="button" (click)="back()">Revenir en arrière</button>
        </div>
      </mat-card>
    </section>
  `
})
export class NotFoundComponent {
  private readonly location = inject(Location);

  back(): void { this.location.back(); }
}
