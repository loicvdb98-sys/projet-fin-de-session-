import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AppNotification, NotificationService } from './notification.service';
import { ToastService } from '@shared/services/toast.service';

@Component({
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatButtonModule, MatCardModule],
  template: `
    <section class="page">
      <div class="page-heading"><div><p class="eyebrow">CENTRE D’ALERTES</p><h1>Notifications</h1><p class="text-secondary">Retrouvez vos rappels et informations importantes.</p></div></div>
      @if (notifications$ | async; as notifications) {
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
  readonly notifications$ = this.service.list();
  read(notification: AppNotification): void {
    this.service.markRead(notification.id).subscribe({
      next: () => { this.toast.showOnNextLoad('Notification marquée comme lue.'); location.reload(); },
      error: () => this.toast.error('Impossible de marquer cette notification comme lue.')
    });
  }
  icon(kind: string): string { return kind === 'success' ? '✓' : kind === 'warning' ? '!' : kind === 'danger' ? '×' : 'i'; }
}
