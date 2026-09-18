import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { API_URL } from '@core/api.config';
import { DEMO_MODE, DEMO_PERFORMANCES } from '@shared/data/demo-data';
export interface Performance { id: number; user_id: number; session_id: number; score: number; notes?: string; recorded_at: string; }
@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly api = `${API_URL}/performances`;
  constructor(private readonly http: HttpClient) {}
  list(): Observable<Performance[]> { return DEMO_MODE ? of(DEMO_PERFORMANCES) : this.http.get<Performance[]>(`${this.api}/`); }
  create(data: Omit<Performance, 'id' | 'recorded_at'>): Observable<Performance> { return this.http.post<Performance>(`${this.api}/`, data); }
}
