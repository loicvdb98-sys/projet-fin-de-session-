/** Service Angular pour les notifications utilisateur : liste et marquage comme lu. */
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface AppNotification {
  id: number; user_id: number; title: string; message: string; kind: string;
  is_read: boolean; created_at: string;
}

/** Lecture et mise à jour de l'état "lu" des notifications de l'utilisateur connecté. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = `${API_URL}/notifications`;
  constructor(private readonly http: HttpClient) {}

  /** Nombre de notifications non lues, affiché dans le menu ; tenu à jour à chaque lecture. */
  readonly unreadCount = signal(0);

  list(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.api).pipe(
      tap((notifications) => this.unreadCount.set(notifications.filter((notification) => !notification.is_read).length))
    );
  }

  markRead(id: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.api}/${id}/read`, {}).pipe(tap(() => this.unreadCount.update((count) => Math.max(0, count - 1))));
  }

  /** Marque toutes les notifications de l'utilisateur comme lues. */
  markAllRead(): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.api}/read-all`, {}).pipe(tap(() => this.unreadCount.set(0)));
  }

  /** Recharge le compteur de non lues (les erreurs sont déjà signalées par l'intercepteur). */
  refreshUnreadCount(): void { this.list().subscribe({ error: () => undefined }); }
}
