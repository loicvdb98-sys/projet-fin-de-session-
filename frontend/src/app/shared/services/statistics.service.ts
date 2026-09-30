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

/** Badge : obtenu ou non, avec la progression vers son objectif. */
export interface Badge {
  code: string; title: string; description: string;
  earned: boolean; progress: number; target: number; earned_at: string | null;
}

/** Badges de l'utilisateur et séries de semaines consécutives avec au moins une présence. */
export interface Badges {
  current_streak_weeks: number; best_streak_weeks: number; earned_count: number; badges: Badge[];
}

/** Récupère les statistiques agrégées de l'utilisateur courant. */
@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly api = `${API_URL}/statistics`;
  constructor(private readonly http: HttpClient) {}

  mine(): Observable<Statistics> { return this.http.get<Statistics>(`${this.api}/me`); }

  /** Badges de l'utilisateur courant et sa série de semaines d'entraînement. */
  badges(): Observable<Badges> { return this.http.get<Badges>(`${this.api}/badges`); }
}
