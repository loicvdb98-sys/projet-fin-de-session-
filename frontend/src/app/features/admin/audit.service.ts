/**
 * Service Angular du journal d'activité (réservé aux admins) : événements de sécurité
 * enregistrés par l'API (connexions, blocages, rôles, mots de passe…).
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface AuditEvent {
  id: number; created_at: string; action: string;
  actor_id: number | null; actor_name: string | null;
  target_user_id: number | null; target_name: string | null;
  details: string | null; ip: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  /** Derniers événements, du plus récent au plus ancien. */
  list(limit = 300): Observable<AuditEvent[]> {
    return this.http.get<AuditEvent[]>(`${API_URL}/admin/audit`, { params: { limit } });
  }
}
