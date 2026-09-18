/**
 * Écran admin "Gestion des comptes" : liste tous les utilisateurs et permet
 * de changer leur rôle ou d'activer/désactiver leur compte. Réservé au rôle
 * admin (voir adminGuard) — l'admin ne peut pas modifier son propre compte
 * depuis cet écran, pour éviter de se retirer ses propres droits par erreur.
 */
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { shareReplay, switchMap } from 'rxjs';
import { User, UserService } from '@features/athletes/user.service';
import { ToastService } from '@shared/services/toast.service';

const ROLES: { value: string; label: string }[] = [
  { value: 'sportif', label: 'Sportif' },
  { value: 'coach', label: 'Coach' },
  { value: 'admin', label: 'Administrateur' },
];

@Component({
  standalone: true,
  imports: [AsyncPipe, MatCardModule, MatFormFieldModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">ESPACE ADMIN</p>
          <h1>Gestion des comptes</h1>
          <p class="text-secondary">Changez le rôle d'un utilisateur ou activez/désactivez son compte.</p>
        </div>
      </div>

      @if (users$ | async; as users) {
        <mat-card class="admin-user-list">
          @for (user of users; track user.id) {
            <div class="admin-user-row" [class.self]="user.id === currentUserId">
              <div class="profile-avatar small-avatar" aria-hidden="true">{{ initials(user.full_name) }}</div>
              <div class="admin-user-identity">
                <strong>{{ user.full_name }}</strong>
                <span class="text-secondary">{{ user.email }}</span>
              </div>
              <span class="role-badge" [class]="'role-' + user.role">{{ roleLabel(user.role) }}</span>

              @if (user.id === currentUserId) {
                <span class="text-secondary admin-self-note">Votre compte</span>
              } @else {
                <mat-form-field appearance="outline" class="admin-role-field" subscriptSizing="dynamic">
                  <mat-select
                    [value]="user.role"
                    (selectionChange)="changeRole(user, $event.value)"
                    aria-label="Changer le rôle"
                  >
                    @for (role of roles; track role.value) { <mat-option [value]="role.value">{{ role.label }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-slide-toggle
                  [checked]="user.is_active"
                  (change)="toggleActive(user, $event.checked)"
                  aria-label="Compte actif"
                >{{ user.is_active ? 'Actif' : 'Désactivé' }}</mat-slide-toggle>
              }
            </div>
          } @empty {
            <p class="empty-state">Aucun compte trouvé.</p>
          }
        </mat-card>
      }
    </section>
  `
})
export class AdminUsersComponent {
  private readonly service = inject(UserService);
  private readonly toast = inject(ToastService);
  readonly roles = ROLES;
  currentUserId?: number;

  // Recharge la liste après chaque modification, pour refléter l'état réel côté serveur.
  private refresh$ = this.service.me();
  readonly users$ = this.refresh$.pipe(
    switchMap((me) => {
      this.currentUserId = me.id;
      return this.service.list();
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  roleLabel(role: string): string {
    return role === 'coach' ? 'Coach' : role === 'admin' ? 'Administrateur' : 'Sportif';
  }

  changeRole(user: User, role: string): void {
    if (role === user.role) return;
    this.service.update(user.id, { role }).subscribe({
      next: () => { user.role = role; this.toast.success(`${user.full_name} est maintenant ${this.roleLabel(role).toLowerCase()}.`); },
      error: () => this.toast.error('Impossible de changer le rôle de ce compte.')
    });
  }

  toggleActive(user: User, isActive: boolean): void {
    this.service.update(user.id, { is_active: isActive }).subscribe({
      next: () => { user.is_active = isActive; this.toast.success(isActive ? `${user.full_name} réactivé.` : `${user.full_name} désactivé.`); },
      error: () => this.toast.error('Impossible de modifier le statut de ce compte.')
    });
  }
}
