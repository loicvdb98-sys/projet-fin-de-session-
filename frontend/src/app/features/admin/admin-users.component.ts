/**
 * Écran admin "Gestion des comptes", au même style « module » que les autres
 * pages : un résumé chiffré, un rail des comptes regroupés par rôle et le détail
 * du compte sélectionné, où l'on change son rôle ou l'active/désactive. Réservé
 * au rôle admin (voir adminGuard) — l'admin ne peut pas modifier son propre
 * compte depuis cet écran, pour éviter de se retirer ses propres droits par erreur.
 */
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { switchMap, tap } from 'rxjs';
import { User, UserService } from '@features/athletes/user.service';
import { ToastService } from '@shared/services/toast.service';
import { markForCheck } from '@core/mark-for-check.operator';

const ROLES: { value: string; label: string; group: string; tint: string }[] = [
  { value: 'admin', label: 'Administrateur', group: 'Administrateurs', tint: 'c-primary' },
  { value: 'coach', label: 'Coach', group: 'Coachs', tint: 'c-secondary' },
  { value: 'sportif', label: 'Sportif', group: 'Sportifs', tint: 'c-info' },
];

@Component({
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <section class="page module-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">ESPACE ADMIN</p>
          <h1>Gestion des comptes</h1>
          <p class="text-secondary">Changez le rôle d'un utilisateur ou activez/désactivez son compte.</p>
        </div>
      </div>

      @if (loading) {
        <p class="text-secondary">Chargement des comptes…</p>
      } @else if (loadError) {
        <p class="empty-state">Impossible de charger les comptes. <button mat-button class="teal-action" (click)="load()">Réessayer</button></p>
      } @else if (!users.length) {
        <p class="empty-state">Aucun compte trouvé.</p>
      } @else {
        <div class="cards">
          <mat-card class="stat-card accent">
            <mat-card-title>Comptes</mat-card-title>
            <strong class="stat-value">{{ users.length }}</strong>
            <p class="text-secondary">utilisateur(s) inscrit(s)</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Coachs</mat-card-title>
            <strong class="stat-value">{{ countByRole('coach') }}</strong>
            <p class="text-secondary">pour {{ countByRole('sportif') }} sportif(s)</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Désactivés</mat-card-title>
            <strong class="stat-value">{{ inactiveCount }}</strong>
            <p class="text-secondary">compte(s) sans accès</p>
          </mat-card>
        </div>

        <div class="module-shell">
          <nav class="module-rail" aria-label="Comptes">
            @for (role of roles; track role.value) {
              @if (usersWithRole(role.value).length) {
                <p class="app-rail-section">{{ role.group }}</p>
                @for (user of usersWithRole(role.value); track user.id) {
                  <button type="button" class="module-rail-item" [class]="role.tint" [class.active]="user.id === selectedId" [attr.aria-current]="user.id === selectedId ? 'true' : null" (click)="selectedId = user.id">
                    <span class="module-rail-icon module-initials" aria-hidden="true">{{ initials(user.full_name) }}</span>
                    <span class="module-rail-text">
                      <span class="module-rail-label">{{ user.full_name }}</span>
                      <small class="module-rail-sublabel">{{ user.id === currentUserId ? 'Votre compte' : user.is_active ? user.email : 'Désactivé · ' + user.email }}</small>
                    </span>
                  </button>
                }
              }
            }
          </nav>

          <div class="module-detail">
            @if (selectedUser; as user) {
              <div class="module-detail-card" [class]="tintFor(user.role)">
                <div class="module-detail-header">
                  <span class="module-icon module-initials" aria-hidden="true">{{ initials(user.full_name) }}</span>
                  <div>
                    <p class="eyebrow">COMPTE · {{ roleLabel(user.role).toUpperCase() }}</p>
                    <h2>{{ user.full_name }}</h2>
                  </div>
                  <span class="module-badge">{{ user.is_active ? 'Actif' : 'Désactivé' }}</span>
                </div>

                <p class="text-secondary">{{ user.email }}</p>

                @if (user.id === currentUserId) {
                  <span class="module-stat-line text-secondary">C’est votre compte : son rôle et son statut ne peuvent pas être modifiés depuis cet écran.</span>
                } @else {
                  <div class="module-controls">
                    <mat-form-field appearance="outline" class="admin-role-field" subscriptSizing="dynamic">
                      <mat-label>Rôle</mat-label>
                      <mat-select [value]="user.role" (selectionChange)="changeRole(user, $event.value)" aria-label="Changer le rôle">
                        @for (role of roles; track role.value) { <mat-option [value]="role.value">{{ role.label }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                    <mat-slide-toggle [checked]="user.is_active" (change)="toggleActive(user, $event.checked)" aria-label="Compte actif">{{ user.is_active ? 'Compte actif' : 'Compte désactivé' }}</mat-slide-toggle>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </section>
  `
})
export class AdminUsersComponent {
  private readonly service = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly cd = inject(ChangeDetectorRef);
  readonly roles = ROLES;
  users: User[] = [];
  currentUserId?: number;
  selectedId: number | null = null;
  loading = true;
  loadError = false;

  constructor() { this.load(); }

  get selectedUser(): User | undefined { return this.users.find((user) => user.id === this.selectedId); }
  get inactiveCount(): number { return this.users.filter((user) => !user.is_active).length; }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.service.me().pipe(
      tap((me) => { this.currentUserId = me.id; }),
      switchMap(() => this.service.list()),
      markForCheck(this.cd)
    ).subscribe({
      next: (users) => {
        this.users = users;
        // Ouvre le premier compte modifiable (dans l'ordre du rail), sinon le sien.
        const ordered = ROLES.flatMap((role) => this.usersWithRole(role.value));
        this.selectedId = (ordered.find((user) => user.id !== this.currentUserId) ?? ordered[0])?.id ?? null;
        this.loading = false;
      },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  usersWithRole(role: string): User[] { return this.users.filter((user) => user.role === role); }
  countByRole(role: string): number { return this.usersWithRole(role).length; }
  tintFor(role: string): string { return ROLES.find((item) => item.value === role)?.tint ?? 'c-info'; }

  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  roleLabel(role: string): string {
    return role === 'coach' ? 'Coach' : role === 'admin' ? 'Administrateur' : 'Sportif';
  }

  changeRole(user: User, role: string): void {
    if (role === user.role) return;
    this.service.update(user.id, { role }).pipe(markForCheck(this.cd)).subscribe({
      next: () => { user.role = role; this.toast.success(`${user.full_name} est maintenant ${this.roleLabel(role).toLowerCase()}.`); },
      error: () => this.toast.error('Impossible de changer le rôle de ce compte.')
    });
  }

  toggleActive(user: User, isActive: boolean): void {
    this.service.update(user.id, { is_active: isActive }).pipe(markForCheck(this.cd)).subscribe({
      next: () => { user.is_active = isActive; this.toast.success(isActive ? `${user.full_name} réactivé.` : `${user.full_name} désactivé.`); },
      error: () => this.toast.error('Impossible de modifier le statut de ce compte.')
    });
  }
}
