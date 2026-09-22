import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AppNotification, NotificationService } from './notification.service';
import { ToastService } from '@shared/services/toast.service';
import { markForCheck } from '@core/mark-for-check.operator';

/** Centre de notifications : liste les alertes de l'utilisateur et permet de les marquer comme lues. */
@Component({
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatCardModule],
  template: `
    <section class="page">
      <div class="page-heading"><div><p class="eyebrow">CENTRE D’ALERTES</p><h1>Notifications</h1><p class="text-secondary">Retrouvez vos rappels et informations importantes.</p></div></div>
      @if (loading) {
        <p class="text-secondary">Chargement des notifications…</p>
      } @else if (loadError) {
        <mat-card class="empty-state-card"><h2>Impossible de charger vos notifications</h2><p class="text-secondary">Vérifiez votre connexion puis réessayez.</p><button mat-stroked-button (click)="load()">Réessayer</button></mat-card>
      } @else {
        <div class="notification-list">
          @for (notification of notifications; track notification.id) {
            <mat-card class="notification-card" [class.unread]="!notification.is_read"><div class="notification-icon" [class]="notification.kind" aria-hidden="true">{{ icon(notification.kind) }}</div><div class="notification-body"><div class="notification-heading"><h2>{{ notification.title }}</h2><small>{{ notification.created_at | date:'dd/MM/yyyy HH:mm' }}</small></div><p>{{ notification.message }}</p>@if (!notification.is_read) { <button mat-button class="teal-action" (click)="read(notification)">Marquer comme lu</button> }</div></mat-card>
          } @empty { <mat-card class="empty-state-card"><h2>Tout est à jour</h2><p class="text-secondary">Vous n’avez aucune notification.</p></mat-card> }
        </div>
      }
    </section>
  `
})
export class NotificationsComponent {
  private readonly service = inject(NotificationService);
  private readonly toast = inject(ToastService);
  private readonly cd = inject(ChangeDetectorRef);
  notifications: AppNotification[] = [];
  loading = true;
  loadError = false;

  constructor() { this.load(); }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.service.list().pipe(markForCheck(this.cd)).subscribe({
      next: (notifications) => { this.notifications = notifications; this.loading = false; },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  /** Marque la notification comme lue côté serveur et met à jour la liste en place, sans recharger la page. */
  read(notification: AppNotification): void {
    this.service.markRead(notification.id).pipe(markForCheck(this.cd)).subscribe({
      next: (updated) => {
        notification.is_read = updated.is_read;
        this.toast.success('Notification marquée comme lue.');
      },
      error: () => this.toast.error('Impossible de marquer cette notification comme lue.')
    });
  }
  icon(kind: string): string { return kind === 'success' ? '✓' : kind === 'warning' ? '!' : kind === 'danger' ? '×' : 'i'; }
}
