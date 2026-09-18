/** Service Angular pour les programmes d'entraînement (modèles réutilisables sur plusieurs semaines). */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface WorkoutProgram {
  id: number; user_id: number; name: string; description?: string; weeks: number;
  sessions: Array<{ title: string; focus?: string; exercises?: string[] }>; created_at: string;
}

/** CRUD des programmes d'entraînement de l'utilisateur connecté. */
@Injectable({ providedIn: 'root' })
export class ProgramService {
  private readonly api = `${API_URL}/programs`;
  constructor(private readonly http: HttpClient) {}

  list(): Observable<WorkoutProgram[]> { return this.http.get<WorkoutProgram[]>(this.api); }
  create(data: Omit<WorkoutProgram, 'id' | 'user_id' | 'created_at'>): Observable<WorkoutProgram> { return this.http.post<WorkoutProgram>(this.api, data); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/${id}`); }
}
