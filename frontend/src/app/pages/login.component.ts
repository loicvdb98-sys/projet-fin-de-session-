import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <mat-card class="auth-card">
      <p class="eyebrow">BIENVENUE SUR SPORTPLAN</p>
      <h1>{{ registerMode ? 'Créer un compte' : 'Connexion' }}</h1>
      <p class="text-secondary">{{ registerMode ? 'Commencez à organiser vos séances.' : 'Reprenez le contrôle de vos séances.' }}</p>

      <form #authForm="ngForm" (ngSubmit)="submit()" novalidate>
        @if (registerMode) {
          <mat-form-field appearance="outline">
            <mat-label>Nom complet</mat-label>
            <input matInput name="fullName" [(ngModel)]="fullName" #fullNameControl="ngModel" required minlength="2" maxlength="150" autocomplete="name">
            @if (fullNameControl.invalid && fullNameControl.touched) { <mat-error>Indiquez votre nom complet.</mat-error> }
          </mat-form-field>
        }
        <mat-form-field appearance="outline">
          <mat-label>Adresse email</mat-label>
          <input matInput type="email" name="email" [(ngModel)]="email" #emailControl="ngModel" required email maxlength="150" autocomplete="email">
          @if (emailControl.invalid && emailControl.touched) { <mat-error>Utilisez une adresse email valide.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Mot de passe</mat-label>
          <input matInput [type]="showPassword ? 'text' : 'password'" name="password" [(ngModel)]="password" #passwordControl="ngModel" required minlength="12" maxlength="128" [pattern]="passwordPattern" [autocomplete]="registerMode ? 'new-password' : 'current-password'">
          <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">{{ showPassword ? '◉' : '◌' }}</button>
          @if (passwordControl.invalid && passwordControl.touched) { <mat-error>12 caractères minimum, avec majuscule, minuscule et chiffre.</mat-error> }
        </mat-form-field>
        @if (registerMode) {
          <mat-form-field appearance="outline">
            <mat-label>Confirmer le mot de passe</mat-label>
            <input matInput [type]="showPassword ? 'text' : 'password'" name="confirmation" [(ngModel)]="confirmation" #confirmationControl="ngModel" required autocomplete="new-password">
            @if (confirmationControl.touched && confirmation !== password) { <mat-error>Les mots de passe sont différents.</mat-error> }
          </mat-form-field>
        }
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        @if (success) { <p class="success-message" role="status">{{ success }}</p> }
        <button mat-flat-button class="primary-action" type="submit" [disabled]="authForm.invalid || (registerMode && confirmation !== password)">
          {{ registerMode ? 'Créer mon compte' : 'Se connecter' }}
        </button>
      </form>
      <button mat-button class="switch-auth" type="button" (click)="toggleMode()">
        {{ registerMode ? 'J’ai déjà un compte' : 'Créer un compte' }}
      </button>
    </mat-card>
  `
})
export class LoginComponent {
  registerMode = false;
  email = '';
  password = '';
  confirmation = '';
  fullName = '';
  error = '';
  success = '';
  showPassword = false;
  readonly passwordPattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[^\\s]{12,128}$';
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  toggleMode(): void {
    this.registerMode = !this.registerMode;
    this.error = '';
    this.success = '';
  }

  submit(): void {
    this.error = '';
    this.success = '';
    const email = this.email.trim().toLowerCase();
    if (this.registerMode) {
      this.auth.register({ email, full_name: this.fullName.trim(), password: this.password, role: 'sportif' }).subscribe({
        next: () => {
          this.success = 'Compte créé. Connexion en cours…';
          this.auth.login(email, this.password).subscribe({
            next: () => void this.router.navigate(['/dashboard']),
            error: (response: { status: number }) => {
              this.error = response.status === 0
                ? 'Compte créé, mais le serveur est indisponible.'
                : 'Compte créé, mais la connexion automatique a échoué.';
            }
          });
        },
        error: (response: { status: number }) => {
          this.error = response.status === 409 ? 'Cette adresse email est déjà utilisée.' : 'Impossible de créer le compte. Vérifiez les informations saisies.';
        }
      });
      return;
    }
    this.auth.login(email, this.password).subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: (response: { status: number }) => {
        this.error = response.status === 0
          ? 'Le serveur est indisponible. Démarrez l’API FastAPI sur le port 8000.'
          : 'Email ou mot de passe incorrect.';
      }
    });
  }
}
