import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { catchError, of, shareReplay } from 'rxjs';
import { UserService } from '@features/athletes/user.service';
import { Statistics, StatisticsService } from '@shared/services/statistics.service';
import { ThemeService } from '@shared/services/theme.service';
import { AuthService } from '@features/auth/auth.service';
import { markForCheck } from '@core/mark-for-check.operator';

type Section = 'info' | 'activity' | 'appearance' | 'security';

/**
 * Écran de profil utilisateur, au même style « module » que les autres pages :
 * un rail de sections (informations personnelles, activité, apparence,
 * sécurité) et le détail de la section sélectionnée.
 */
@Component({ standalone: true, template: `
<section class="page module-page">
  @if (user$ | async; as user) {
    <div class="page-heading">
      <div><p class="eyebrow">MON COMPTE</p><h1>Profil</h1><p class="text-secondary">Gérez votre identité, vos préférences et votre progression.</p></div>
      <span class="status-badge success"><span aria-hidden="true">●</span> Compte actif</span>
    </div>

    <div class="module-shell">
      <nav class="module-rail" aria-label="Sections du profil">
        <p class="app-rail-section">Mon compte</p>
        <button type="button" class="module-rail-item c-primary" [class.active]="section === 'info'" [attr.aria-current]="section === 'info' ? 'true' : null" (click)="section = 'info'">
          <span class="module-rail-icon module-initials" aria-hidden="true">{{ initials(user.full_name) }}</span>
          <span class="module-rail-text"><span class="module-rail-label">Informations</span><small class="module-rail-sublabel">{{ user.full_name }}</small></span>
        </button>
        <button type="button" class="module-rail-item c-info" [class.active]="section === 'activity'" [attr.aria-current]="section === 'activity' ? 'true' : null" (click)="section = 'activity'">
          <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/></svg></span>
          <span class="module-rail-text"><span class="module-rail-label">Mon activité</span><small class="module-rail-sublabel">Séances et performances</small></span>
        </button>
        <p class="app-rail-section">Réglages</p>
        <button type="button" class="module-rail-item c-secondary" [class.active]="section === 'appearance'" [attr.aria-current]="section === 'appearance' ? 'true' : null" (click)="section = 'appearance'">
          <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg></span>
          <span class="module-rail-text"><span class="module-rail-label">Apparence</span><small class="module-rail-sublabel">Thème {{ theme.theme() === 'dark' ? 'sombre' : 'clair' }}</small></span>
        </button>
        <button type="button" class="module-rail-item c-danger" [class.active]="section === 'security'" [attr.aria-current]="section === 'security' ? 'true' : null" (click)="section = 'security'">
          <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>
          <span class="module-rail-text"><span class="module-rail-label">Sécurité</span><small class="module-rail-sublabel">Mot de passe et session</small></span>
        </button>
      </nav>

      <div class="module-detail">
        @switch (section) {
          @case ('info') {
            <div class="module-detail-card c-primary">
              <div class="module-detail-header">
                <span class="module-icon module-initials" aria-hidden="true">{{ initials(user.full_name) }}</span>
                <div><p class="eyebrow">INFORMATIONS PERSONNELLES</p><h2>{{ user.full_name }}</h2></div>
                <span class="module-badge">{{ roleLabel(user.role) }}</span>
              </div>
              <p class="text-secondary">{{ user.email }} · identifiant #{{ user.id }}</p>
              <form class="module-form" [formGroup]="form" (ngSubmit)="save(user.id)">
                <mat-form-field appearance="outline"><mat-label>Nom complet</mat-label><input matInput formControlName="full_name"><mat-error>Le nom est obligatoire.</mat-error></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Adresse email</mat-label><input matInput [value]="user.email" disabled><mat-hint>L’adresse email ne peut pas être modifiée ici.</mat-hint></mat-form-field>
                <div class="form-actions"><button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid || saving">Enregistrer les modifications</button>@if (message) { <span class="inline-message" [class]="saveFailed ? 'error' : 'success-message'" role="status">{{ message }}</span> }</div>
              </form>
            </div>
          }
          @case ('activity') {
            <div class="module-detail-card c-info">
              <div class="module-detail-header">
                <span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/></svg></span>
                <div><p class="eyebrow">PROGRESSION</p><h2>Mon activité</h2></div>
              </div>
              @if (stats$ | async; as stats) {
                <div class="profile-stats">
                  @if (user.role === 'sportif') {
                    <div><strong>{{ stats.total_participations }}</strong><span>Inscriptions</span></div>
                    <div><strong>{{ stats.attended_sessions }}</strong><span>Séances suivies</span></div>
                    <div><strong>{{ stats.upcoming_sessions }}</strong><span>À venir</span></div>
                  } @else {
                    <div><strong>{{ stats.total_sessions }}</strong><span>Séances animées</span></div>
                    <div><strong>{{ stats.total_participations }}</strong><span>Participations</span></div>
                    <div><strong>{{ stats.attended_sessions }}</strong><span>Présences</span></div>
                  }
                  <div><strong>{{ stats.total_performances }}</strong><span>Performances</span></div>
                </div>
              } @else { <p class="text-secondary">Les statistiques seront disponibles après votre première activité.</p> }
              <a class="module-detail-cta" routerLink="/performances">Voir mes statistiques →</a>
            </div>
          }
          @case ('appearance') {
            <div class="module-detail-card c-secondary">
              <div class="module-detail-header">
                <span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg></span>
                <div><p class="eyebrow">PRÉFÉRENCES</p><h2>Apparence</h2></div>
              </div>
              <div class="preference-row"><div><strong>Mode sombre</strong><small>Adaptez l’affichage à votre environnement.</small></div><mat-slide-toggle [checked]="theme.theme() === 'dark'" (change)="theme.toggle()" aria-label="Activer le mode sombre"></mat-slide-toggle></div>
            </div>
          }
          @case ('security') {
            <div class="module-detail-card c-danger">
              <div class="module-detail-header">
                <span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>
                <div><p class="eyebrow">SÉCURITÉ</p><h2>Compte et sécurité</h2></div>
              </div>
              <p class="text-secondary">Votre session est protégée par une authentification JWT. Changer de mot de passe déconnecte vos autres appareils.</p>
              <form class="module-form" [formGroup]="passwordForm" (ngSubmit)="changePassword()">
                <mat-form-field appearance="outline"><mat-label>Mot de passe actuel</mat-label><input matInput type="password" autocomplete="current-password" formControlName="current_password"></mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Nouveau mot de passe</mat-label><input matInput type="password" autocomplete="new-password" formControlName="new_password">
                  <mat-hint>12 caractères minimum, avec une majuscule, une minuscule et un chiffre, sans espace.</mat-hint>
                  @if (passwordForm.controls.new_password.hasError('pattern')) { <mat-error>Ajoutez une majuscule, une minuscule et un chiffre (sans espace).</mat-error> }
                  @else if (passwordForm.controls.new_password.hasError('minlength')) { <mat-error>12 caractères minimum.</mat-error> }
                </mat-form-field>
                <div class="form-actions"><button mat-flat-button class="primary-action" type="submit" [disabled]="passwordForm.invalid">Modifier le mot de passe</button>@if (passwordMessage) { <span class="inline-message" [class]="passwordFailed ? 'error' : 'success-message'" role="status">{{ passwordMessage }}</span> }</div>
              </form>
              <div class="module-detail-actions">
                <button type="button" class="action-chip danger" (click)="logoutEverywhere()" [disabled]="closingSessions">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
                  Se déconnecter de tous les appareils
                </button>
                <a class="action-chip" routerLink="/login">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>
                  Se connecter avec un autre compte
                </a>
              </div>
            </div>
          }
        }
      </div>
    </div>
  } @else {
    <mat-card class="empty-state-card"><h2>Profil indisponible</h2><p class="text-secondary">Impossible de charger vos informations pour le moment.</p></mat-card>
  }
</section>` , imports: [AsyncPipe, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, RouterLink] })
/** Combine profil, statistiques, apparence et sécurité (mot de passe), une section à la fois. */
export class ProfileComponent {
  private readonly service = inject(UserService); private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly statistics = inject(StatisticsService);
  private readonly cd = inject(ChangeDetectorRef);
  readonly user$ = this.service.me().pipe(shareReplay({ bufferSize: 1, refCount: true }));
  readonly stats$ = this.statistics.mine().pipe(catchError(() => of<Statistics | null>(null)), shareReplay({ bufferSize: 1, refCount: true }));
  readonly form = this.fb.nonNullable.group({ full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]] });
  // Même politique que le serveur : au moins une minuscule, une majuscule et un chiffre, sans espace.
  readonly passwordForm = this.fb.nonNullable.group({ current_password: ['', Validators.required], new_password: ['', [Validators.required, Validators.minLength(12), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/)]] });
  section: Section = 'info';
  saving = false;
  message = '';
  passwordMessage = '';
  saveFailed = false;
  passwordFailed = false;
  closingSessions = false;
  constructor() { this.user$.subscribe(user => this.form.patchValue({ full_name: user.full_name })); }
  initials(name: string): string { return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join(''); }
  roleLabel(role: string): string { return role === 'coach' ? 'Coach' : role === 'admin' ? 'Administrateur' : 'Sportif'; }

  /** Enregistre le nom complet modifié via UserService.update. */
  save(id: number): void {
    if (this.form.invalid) return;
    this.saving = true; this.message = '';
    this.service.update(id, this.form.getRawValue()).pipe(markForCheck(this.cd)).subscribe({
      next: () => { this.saving = false; this.saveFailed = false; this.message = 'Profil mis à jour.'; },
      error: () => { this.saving = false; this.saveFailed = true; this.message = 'La mise à jour a échoué. Réessayez.'; }
    });
  }

  /** Change le mot de passe puis réinitialise le formulaire en cas de succès. */
  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const { current_password, new_password } = this.passwordForm.getRawValue();
    this.auth.changePassword(current_password, new_password).pipe(markForCheck(this.cd)).subscribe({
      next: () => { this.passwordForm.reset(); this.passwordFailed = false; this.passwordMessage = 'Mot de passe modifié. Vos autres appareils ont été déconnectés.'; },
      error: (error) => {
        this.passwordFailed = true;
        // detail est une chaîne pour les erreurs métier (ex. mot de passe actuel incorrect),
        // une liste pour les erreurs de validation (422) : on affiche alors le premier message.
        const detail = error?.error?.detail;
        const validation = Array.isArray(detail) ? String(detail[0]?.msg ?? '').replace(/^Value error, /, '') : '';
        this.passwordMessage = typeof detail === 'string' ? detail : validation || 'Impossible de modifier le mot de passe.';
      }
    });
  }

  /** Ferme toutes les sessions du compte (téléphone, ordinateur…) après confirmation. */
  logoutEverywhere(): void {
    if (!confirm('Se déconnecter de tous les appareils, y compris celui-ci ?')) return;
    this.closingSessions = true;
    this.auth.logoutEverywhere().pipe(markForCheck(this.cd)).subscribe({
      error: () => { this.closingSessions = false; this.passwordFailed = true; this.passwordMessage = 'La déconnexion des appareils a échoué. Réessayez.'; }
    });
  }
}
