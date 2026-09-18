import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface TrainingJournal {
  id: number; user_id: number; session_id: number; notes?: string; fatigue: number;
  mood: string; pain?: string; coach_comment?: string; created_at: string; updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class JournalService {
  private readonly api = `${API_URL}/journal`;
  constructor(private readonly http: HttpClient) {}
  list(): Observable<TrainingJournal[]> { return this.http.get<TrainingJournal[]>(this.api); }
  create(data: Omit<TrainingJournal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Observable<TrainingJournal> {
    return this.http.post<TrainingJournal>(this.api, data);
  }
}
