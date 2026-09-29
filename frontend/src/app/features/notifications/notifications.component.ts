import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AppNotification, NotificationService } from './notification.service';
import { ToastService } from '@shared/services/toast.service';
import { markForCheck } from '@core/mark-for-check.operator';

/**
 * Centre de notifications, au même style « module » que les autres pages : un
 * rail (non lues puis lues) et le détail de la notification sélectionnée, qu'on
 * peut marquer comme lue.
 */
@Component({
  standalone: true,
  imports: [DatePipe, NgTemplateOutlet, MatButtonModule],
  template: `
    <section class="page module-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">CENTRE D’ALERTES</p>
          <h1>Notifications</h1>
          <p class="text-secondary">Retrouvez vos rappels et informations importantes.</p>
        </div>
        @if (unread.length > 1) {
          <button type="button" class="action-chip primary" (click)="markAllRead()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12.5l3.5 3.5L12 9.5"/><path d="M10 15l1 1 8-8"/></svg>
            Tout marquer comme lu
          </button>
        }
      </div>

      @if (loading) {
        <p class="text-secondary">Chargement des notifications…</p>
      } @else if (loadError) {
        <p class="empty-state">Impossible de charger vos notifications. <button mat-button class="teal-action" (click)="load()">Réessayer</button></p>
      } @else if (!notifications.length) {
        <p class="empty-state">Tout est à jour : vous n’avez aucune notification.</p>
      } @else {
        <div class="module-shell">
          <nav class="module-rail" aria-label="Notifications">
            @if (unread.length) {
              <p class="app-rail-section">Non lues</p>
              @for (notification of unread; track notification.id) {
                <ng-container *ngTemplateOutlet="railItemTpl; context: { notification: notification }"></ng-container>
              }
            }
            @if (read.length) {
              <p class="app-rail-section">Lues</p>
              @for (notification of read; track notification.id) {
                <ng-container *ngTemplateOutlet="railItemTpl; context: { notification: notification }"></ng-container>
              }
            }
          </nav>

          <div class="module-detail">
            @if (selectedNotification; as notification) {
              <div class="module-detail-card" [class]="tint(notification.kind)">
                <div class="module-detail-header">
                  <span class="module-icon" aria-hidden="true"><ng-container *ngTemplateOutlet="bellIcon"></ng-container></span>
                  <div>
                    <p class="eyebrow">NOTIFICATION · {{ notification.created_at | date:'dd/MM/yyyy HH:mm' }}</p>
                    <h2>{{ notification.title }}</h2>
                  </div>
                  <span class="module-badge">{{ notification.is_read ? 'Lue' : 'Non lue' }}</span>
                </div>

                <p class="text-secondary">{{ notification.message }}</p>

                @if (!notification.is_read) {
                  <div class="module-detail-actions">
                    <button type="button" class="action-chip primary" (click)="markRead(notification)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>
                      Marquer comme lu
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <ng-template #railItemTpl let-notification="notification">
          <button
            type="button"
            class="module-rail-item"
            [class]="tint(notification.kind)"
            [class.active]="notification.id === selectedId"
            [attr.aria-current]="notification.id === selectedId ? 'true' : null"
            (click)="selectedId = notification.id">
            <span class="module-rail-icon" aria-hidden="true"><ng-container *ngTemplateOutlet="bellIcon"></ng-container></span>
            <span class="module-rail-text">
              <span class="module-rail-label">{{ notification.title }}</span>
              <small class="module-rail-sublabel">{{ notification.created_at | date:'dd/MM HH:mm' }}</small>
            </span>
            @if (!notification.is_read) { <span class="module-rail-dot" aria-label="Non lue"></span> }
          </button>
        </ng-template>
        <ng-template #bellIcon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg></ng-template>
      }
    </section>
  `
})
export class NotificationsComponent {
  private readonly service = inject(NotificationService);
  private readonly toast = inject(ToastService);
  private readonly cd = inject(ChangeDetectorRef);
  notifications: AppNotification[] = [];
  selectedId: number | null = null;
  loading = true;
  loadError = false;

  constructor() { this.load(); }

  get unread(): AppNotification[] { return this.notifications.filter((notification) => !notification.is_read); }
  get read(): AppNotification[] { return this.notifications.filter((notification) => notification.is_read); }

  get selectedNotification(): AppNotification | undefined {
    return this.notifications.find((notification) => notification.id === this.selectedId);
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.service.list().pipe(markForCheck(this.cd)).subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        // Ouvre la première non lue, sinon la plus récente.
        this.selectedId = (this.unread[0] ?? notifications[0])?.id ?? null;
        this.loading = false;
      },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  /** Marque la notification comme lue côté serveur et met à jour la liste en place, sans recharger la page. */
  markRead(notification: AppNotification): void {
    this.service.markRead(notification.id).pipe(markForCheck(this.cd)).subscribe({
      next: (updated) => {
        notification.is_read = updated.is_read;
        this.toast.success('Notification marquée comme lue.');
      },
      error: () => this.toast.error('Impossible de marquer cette notification comme lue.')
    });
  }

  /** Marque toutes les notifications comme lues côté serveur puis dans la liste affichée. */
  markAllRead(): void {
    this.service.markAllRead().pipe(markForCheck(this.cd)).subscribe({
      next: () => {
        this.notifications = this.notifications.map((notification) => ({ ...notification, is_read: true }));
        this.toast.success('Toutes les notifications sont marquées comme lues.');
      },
      error: () => this.toast.error('Impossible de marquer les notifications comme lues.')
    });
  }

  /** Couleur du module selon le type de notification (info par défaut). */
  tint(kind: string): string {
    return kind === 'success' ? 'c-success' : kind === 'warning' ? 'c-warning' : kind === 'danger' ? 'c-danger' : 'c-info';
  }
}
