import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SportSession {
  id: number; title: string; starts_at: string; coach_id: number;
  duration_minutes: number; description?: string; capacity: number;
}

export interface Exercise {
  id: number; session_id: number; name: string; description?: string;
  sets: number; repetitions?: number; rest_seconds: number;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly apiUrl = 'http://localhost:8001/sessions';
  constructor(private readonly http: HttpClient) {}
  list(): Observable<SportSession[]> { return this.http.get<SportSession[]>(this.apiUrl); }
  create(data: Omit<SportSession, 'id'>): Observable<SportSession> { return this.http.post<SportSession>(`${this.apiUrl}/`, data); }
  exercises(sessionId: number): Observable<Exercise[]> { return this.http.get<Exercise[]>(`${this.apiUrl}/${sessionId}/exercises/`); }
  addExercise(sessionId: number, data: Omit<Exercise, 'id' | 'session_id'>): Observable<Exercise> {
    return this.http.post<Exercise>(`${this.apiUrl}/${sessionId}/exercises/`, data);
  }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/${id}`); }
}
