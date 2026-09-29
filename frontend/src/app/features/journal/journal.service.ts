/**
 * Service Angular pour le journal d'entraînement (bilans post-séance :
 * fatigue, humeur, douleur, commentaire du coach).
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface TrainingJournal {
  id: number; user_id: number; session_id: number; notes?: string; fatigue: number;
  mood: string; pain?: string; coach_comment?: string; created_at: string; updated_at: string;
}

/** Lecture, création, modification et suppression des entrées de journal. */
@Injectable({ providedIn: 'root' })
export class JournalService {
  private readonly api = `${API_URL}/journal`;
  constructor(private readonly http: HttpClient) {}

  list(): Observable<TrainingJournal[]> { return this.http.get<TrainingJournal[]>(this.api); }

  create(data: Omit<TrainingJournal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Observable<TrainingJournal> {
    return this.http.post<TrainingJournal>(this.api, data);
  }

  /** Modifie une entrée : ses propres champs pour l'auteur, le commentaire pour le coach de la séance. */
  update(id: number, changes: Partial<Pick<TrainingJournal, 'fatigue' | 'mood' | 'notes' | 'pain' | 'coach_comment'>>): Observable<TrainingJournal> {
    return this.http.patch<TrainingJournal>(`${this.api}/${id}`, changes);
  }

  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/${id}`); }
}
