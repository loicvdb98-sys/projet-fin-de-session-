import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { RouterLink } from '@angular/router';
import { catchError, of, shareReplay } from 'rxjs';
import { UserService } from '@features/athletes/user.service';
import { Statistics, StatisticsService } from '@shared/services/statistics.service';
import { ThemeService } from '@shared/services/theme.service';
import { AuthService } from '@features/auth/auth.service';
import { markForCheck } from '@core/mark-for-check.operator';
/**
 * Écran de profil utilisateur : informations personnelles, statistiques
 * d'activité, préférence de thème et changement de mot de passe.
 */
@Component({ standalone: true, template: `
<section class="page profile-page">
  @if (user$ | async; as user) {
    <div class="page-heading">
      <div><p class="eyebrow">MON COMPTE</p><h1>Profil</h1><p class="text-secondary">Gérez votre identité, vos préférences et votre progression.</p></div>
      <span class="status-badge success"><span aria-hidden="true">●</span> Compte actif</span>
    </div>
    <div class="profile-layout">
      <mat-card class="profile-hero">
        <div class="profile-avatar" aria-hidden="true">{{ initials(user.full_name) }}</div>
        <h2>{{ user.full_name }}</h2>
        <p class="text-secondary">{{ user.email }}</p>
        <span class="role-badge" [class]="'role-' + user.role">{{ roleLabel(user.role) }}</span>
        <mat-divider></mat-divider>
        <dl class="profile-details">
          <div><dt>Identifiant</dt><dd>#{{ user.id }}</dd></div>
          <div><dt>Statut</dt><dd>Actif</dd></div>
          <div><dt>Accès</dt><dd>{{ roleLabel(user.role) }}</dd></div>
        </dl>
        <a mat-stroked-button routerLink="/performances" class="full-width-button">Voir mes statistiques</a>
      </mat-card>
      <div class="profile-content">
        <mat-card>
          <div class="card-heading"><div><p class="eyebrow">INFORMATIONS</p><h2>Informations personnelles</h2></div><span aria-hidden="true">✎</span></div>
          <form class="profile-form" [formGroup]="form" (ngSubmit)="save(user.id)">
            <mat-form-field appearance="outline"><mat-label>Nom complet</mat-label><input matInput formControlName="full_name"><mat-error>Le nom est obligatoire.</mat-error></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Adresse email</mat-label><input matInput [value]="user.email" disabled><mat-hint>L’adresse email ne peut pas être modifiée ici.</mat-hint></mat-form-field>
            <div class="form-actions"><button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid || saving">Enregistrer les modifications</button>@if (message) { <span class="success-message inline-message">{{ message }}</span> }</div>
          </form>
        </mat-card>
        <mat-card>
          <div class="card-heading"><div><p class="eyebrow">PROGRESSION</p><h2>Mon activité</h2></div><a mat-button routerLink="/performances" class="teal-action">Détails</a></div>
          @if (stats$ | async; as stats) {
            <div class="profile-stats">
              <div><strong>{{ stats.total_sessions }}</strong><span>Séances créées</span></div>
              <div><strong>{{ stats.total_participations }}</strong><span>Participations</span></div>
              <div><strong>{{ stats.attended_sessions }}</strong><span>Séances suivies</span></div>
              <div><strong>{{ stats.total_performances }}</strong><span>Performances</span></div>
            </div>
          } @else { <p class="text-secondary">Les statistiques seront disponibles après votre première activité.</p> }
        </mat-card>
        <mat-card>
          <div class="card-heading"><div><p class="eyebrow">PRÉFÉRENCES</p><h2>Apparence</h2></div><span aria-hidden="true">◐</span></div>
          <div class="preference-row"><div><strong>Mode sombre</strong><small>Adaptez l’affichage à votre environnement.</small></div><mat-slide-toggle [checked]="theme.theme() === 'dark'" (change)="theme.toggle()" aria-label="Activer le mode sombre"></mat-slide-toggle></div>
        </mat-card>
        <mat-card class="security-card">
          <div class="card-heading"><div><p class="eyebrow">SÉCURITÉ</p><h2>Compte et sécurité</h2></div><span aria-hidden="true">🔒</span></div>
          <p class="text-secondary">Votre session est protégée par une authentification JWT. Déconnectez-vous toujours après avoir utilisé un appareil partagé.</p>
          <form class="profile-form" [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <mat-form-field appearance="outline"><mat-label>Mot de passe actuel</mat-label><input matInput type="password" formControlName="current_password"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Nouveau mot de passe</mat-label><input matInput type="password" formControlName="new_password"><mat-hint>Minimum 12 caractères.</mat-hint></mat-form-field>
            <button mat-stroked-button type="submit" [disabled]="passwordForm.invalid">Modifier le mot de passe</button>
            @if (passwordMessage) { <span class="success-message inline-message">{{ passwordMessage }}</span> }
          </form>
          <button mat-stroked-button routerLink="/login">Se connecter avec un autre compte</button>
        </mat-card>
      </div>
    </div>
  } @else {
    <mat-card class="empty-state-card"><h2>Profil indisponible</h2><p class="text-secondary">Impossible de charger vos informations pour le moment.</p></mat-card>
  }
</section>` , imports: [AsyncPipe, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatDividerModule, RouterLink] })
/** Combine profil, statistiques et sécurité (mot de passe) sur un seul écran. */
export class ProfileComponent {
  private readonly service = inject(UserService); private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly statistics = inject(StatisticsService);
  private readonly cd = inject(ChangeDetectorRef);
  readonly user$ = this.service.me().pipe(shareReplay({ bufferSize: 1, refCount: true }));
  readonly stats$ = this.statistics.mine().pipe(catchError(() => of<Statistics | null>(null)), shareReplay({ bufferSize: 1, refCount: true }));
  readonly form = this.fb.nonNullable.group({ full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]] });
  readonly passwordForm = this.fb.nonNullable.group({ current_password: ['', [Validators.required, Validators.minLength(12)]], new_password: ['', [Validators.required, Validators.minLength(12)]] });
  saving = false;
  message = '';
  passwordMessage = '';
  constructor() { this.user$.subscribe(user => this.form.patchValue({ full_name: user.full_name })); }
  initials(name: string): string { return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join(''); }
  roleLabel(role: string): string { return role === 'coach' ? 'Coach' : role === 'admin' ? 'Administrateur' : 'Sportif'; }

  /** Enregistre le nom complet modifié via UserService.update. */
  save(id: number): void {
    if (this.form.invalid) return;
    this.saving = true; this.message = '';
    this.service.update(id, this.form.getRawValue()).pipe(markForCheck(this.cd)).subscribe({
      next: () => { this.saving = false; this.message = 'Profil mis à jour.'; },
      error: () => { this.saving = false; this.message = 'La mise à jour a échoué. Réessayez.'; }
    });
  }

  /** Change le mot de passe puis réinitialise le formulaire en cas de succès. */
  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const { current_password, new_password } = this.passwordForm.getRawValue();
    this.auth.changePassword(current_password, new_password).pipe(markForCheck(this.cd)).subscribe({
      next: () => { this.passwordForm.reset(); this.passwordMessage = 'Mot de passe modifié avec succès.'; },
      error: (error) => { this.passwordMessage = error?.error?.detail || 'Impossible de modifier le mot de passe.'; }
    });
  }
}
