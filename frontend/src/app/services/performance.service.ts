import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface Performance { id: number; user_id: number; session_id: number; score: number; notes?: string; recorded_at: string; }
@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly api = 'http://localhost:8001/performances';
  constructor(private readonly http: HttpClient) {}
  list(): Observable<Performance[]> { return this.http.get<Performance[]>(`${this.api}/`); }
  create(data: Omit<Performance, 'id' | 'recorded_at'>): Observable<Performance> { return this.http.post<Performance>(`${this.api}/`, data); }
}
