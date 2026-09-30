/**
 * Écran « Mot de passe oublié » : demande un lien de réinitialisation par email. Le message
 * affiché est le même que l'adresse corresponde à un compte ou non (le serveur ne le révèle pas).
 */
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from './auth.service';
import { markForCheck } from '@core/mark-for-check.operator';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-card class="auth-card">
      <p class="eyebrow">MOT DE PASSE OUBLIÉ</p>
      <h1>Réinitialiser</h1>
      <p class="text-secondary">Indiquez l’adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe, valable 30 minutes.</p>

      @if (sent) {
        <p class="success-message" role="status">{{ sent }}</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="outline">
            <mat-label>Adresse email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email">
            @if (form.controls.email.invalid && form.controls.email.touched) { <mat-error>Utilisez une adresse email valide.</mat-error> }
          </mat-form-field>
          @if (error) { <p class="error" role="alert">{{ error }}</p> }
          <button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid || sending">Envoyer le lien</button>
        </form>
      }
      <a mat-button class="switch-auth" routerLink="/login">Retour à la connexion</a>
    </mat-card>
  `
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly cd = inject(ChangeDetectorRef);
  readonly form = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]] });
  sending = false;
  sent = '';
  error = '';

  /** Demande le lien ; en cas de succès, affiche le message neutre renvoyé par le serveur. */
  submit(): void {
    if (this.form.invalid) return;
    this.sending = true;
    this.error = '';
    this.auth.forgotPassword(this.form.getRawValue().email.trim().toLowerCase()).pipe(markForCheck(this.cd)).subscribe({
      next: (message) => { this.sending = false; this.sent = message; },
      error: (response: { status: number; error?: { detail?: unknown } }) => {
        this.sending = false;
        this.error = response.status === 429 && typeof response.error?.detail === 'string'
          ? response.error.detail
          : 'La demande n’a pas pu être envoyée. Réessayez dans un instant.';
      }
    });
  }
}
