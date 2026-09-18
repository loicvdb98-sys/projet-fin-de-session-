import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface AppNotification {
  id: number; user_id: number; title: string; message: string; kind: string;
  is_read: boolean; created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = `${API_URL}/notifications`;
  constructor(private readonly http: HttpClient) {}
  list(): Observable<AppNotification[]> { return this.http.get<AppNotification[]>(this.api); }
  markRead(id: number): Observable<AppNotification> { return this.http.patch<AppNotification>(`${this.api}/${id}/read`, {}); }
}
