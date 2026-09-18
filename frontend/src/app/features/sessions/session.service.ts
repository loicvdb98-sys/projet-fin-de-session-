/**
 * Service Angular pour les séances d'entraînement et leurs exercices :
 * consultation, création (coach) et gestion des exercices associés.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface SportSession {
  id: number; title: string; starts_at: string; coach_id: number; coach_name: string;
  duration_minutes: number; description?: string; capacity: number; registered_count: number;
}

export interface Exercise {
  id: number; session_id: number; name: string; description?: string;
  sets: number; repetitions?: number; rest_seconds: number;
}

/** CRUD des séances et de leurs exercices. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly apiUrl = `${API_URL}/sessions`;
  constructor(private readonly http: HttpClient) {}

  list(): Observable<SportSession[]> { return this.http.get<SportSession[]>(this.apiUrl); }
  // coach_name et registered_count sont calculés par le serveur : jamais envoyés à la création.
  create(data: Omit<SportSession, 'id' | 'coach_name' | 'registered_count'>): Observable<SportSession> { return this.http.post<SportSession>(`${this.apiUrl}/`, data); }
  update(id: number, data: Partial<Pick<SportSession, 'title' | 'description' | 'starts_at' | 'duration_minutes' | 'capacity'>>): Observable<SportSession> {
    return this.http.patch<SportSession>(`${this.apiUrl}/${id}`, data);
  }
  exercises(sessionId: number): Observable<Exercise[]> { return this.http.get<Exercise[]>(`${this.apiUrl}/${sessionId}/exercises/`); }
  addExercise(sessionId: number, data: Omit<Exercise, 'id' | 'session_id'>): Observable<Exercise> {
    return this.http.post<Exercise>(`${this.apiUrl}/${sessionId}/exercises/`, data);
  }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/${id}`); }
}
