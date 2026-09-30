/**
 * Écran ouvert depuis le lien reçu par email (/reset-password?token=…) : choix d'un nouveau
 * mot de passe, avec la même règle qu'à l'inscription. Le lien ne sert qu'une fois ; toutes
 * les sessions ouvertes du compte sont fermées côté serveur.
 */
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from './auth.service';
import { markForCheck } from '@core/mark-for-check.operator';

/** Les deux saisies du nouveau mot de passe doivent être identiques. */
function samePasswords(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirmation')?.value ? null : { mismatch: true };
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-card class="auth-card">
      <p class="eyebrow">NOUVEAU MOT DE PASSE</p>
      <h1>Choisir un mot de passe</h1>

      @if (!token) {
        <p class="error" role="alert">Ce lien est incomplet. Faites une nouvelle demande de réinitialisation.</p>
        <a mat-button class="switch-auth" routerLink="/forgot-password">Demander un nouveau lien</a>
      } @else if (done) {
        <p class="success-message" role="status">Mot de passe modifié. Vous pouvez vous connecter avec votre nouveau mot de passe.</p>
        <a mat-flat-button class="primary-action" routerLink="/login">Se connecter</a>
      } @else {
        <p class="text-secondary">12 caractères minimum, avec une majuscule, une minuscule et un chiffre, sans espace.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="outline">
            <mat-label>Nouveau mot de passe</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="new-password">
            @if (form.controls.password.invalid && form.controls.password.touched) { <mat-error>12 caractères minimum, avec majuscule, minuscule et chiffre.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Confirmer le mot de passe</mat-label>
            <input matInput type="password" formControlName="confirmation" autocomplete="new-password">
          </mat-form-field>
          @if (form.hasError('mismatch') && form.controls.confirmation.touched) { <p class="error" role="alert">Les mots de passe sont différents.</p> }
          @if (error) {
            <p class="error" role="alert">{{ error }}</p>
            <a mat-button class="switch-auth" routerLink="/forgot-password">Demander un nouveau lien</a>
          }
          <button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid || saving">Enregistrer le mot de passe</button>
        </form>
      }
    </mat-card>
  `
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly cd = inject(ChangeDetectorRef);
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';
  readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/)]],
    confirmation: ['', Validators.required],
  }, { validators: samePasswords });
  saving = false;
  done = false;
  error = '';

  submit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    this.auth.resetPassword(this.token, this.form.getRawValue().password).pipe(markForCheck(this.cd)).subscribe({
      next: () => { this.saving = false; this.done = true; },
      error: (response: { error?: { detail?: unknown } }) => {
        this.saving = false;
        const detail = response.error?.detail;
        this.error = typeof detail === 'string' ? detail : 'Le mot de passe n’a pas pu être modifié.';
      }
    });
  }
}
