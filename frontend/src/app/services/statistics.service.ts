import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { API_URL } from '../api.config';
import { DEMO_MODE, DEMO_STATISTICS } from '../demo-data';

export interface Statistics {
  total_sessions: number;
  upcoming_sessions: number;
  total_participations: number;
  attended_sessions: number;
  total_performances: number;
  average_score: number | null;
}

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly api = `${API_URL}/statistics`;
  constructor(private readonly http: HttpClient) {}
  mine(): Observable<Statistics> { return DEMO_MODE ? of(DEMO_STATISTICS) : this.http.get<Statistics>(`${this.api}/me`); }
}
