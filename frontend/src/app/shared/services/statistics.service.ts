/**
 * Service Angular exposant les statistiques agrégées de l'utilisateur connecté
 * (séances, participations, performances) depuis l'API, ou des données de
 * démonstration figées si DEMO_MODE est actif.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { API_URL } from '@core/api.config';
import { DEMO_MODE, DEMO_STATISTICS } from '@shared/data/demo-data';

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

  /** Statistiques de l'utilisateur connecté (données de démo si DEMO_MODE est actif). */
  mine(): Observable<Statistics> { return DEMO_MODE ? of(DEMO_STATISTICS) : this.http.get<Statistics>(`${this.api}/me`); }
}
