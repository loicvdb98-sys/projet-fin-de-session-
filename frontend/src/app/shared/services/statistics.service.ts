/**
 * Service Angular exposant les statistiques agrégées de l'utilisateur connecté
 * (séances, participations, performances) depuis l'API.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface Statistics {
  total_sessions: number;
  upcoming_sessions: number;
  total_participations: number;
  attended_sessions: number;
  total_performances: number;
  average_score: number | null;
}

/** Récupère les statistiques agrégées de l'utilisateur courant. */
@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly api = `${API_URL}/statistics`;
  constructor(private readonly http: HttpClient) {}

  mine(): Observable<Statistics> { return this.http.get<Statistics>(`${this.api}/me`); }
}
