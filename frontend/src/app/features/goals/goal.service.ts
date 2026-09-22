/** Service Angular pour les objectifs et records personnels du sportif connecté. */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface Goal {
  id: number; user_id: number; title: string; metric: string; target_value: number;
  current_value: number; unit: string; due_date?: string; notes?: string;
}
export interface PersonalRecord {
  id: number; user_id: number; exercise_name: string; value: number; unit: string;
  achieved_at: string; notes?: string;
}

/** CRUD des objectifs et records personnels du sportif connecté. */
@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly api = API_URL;
  constructor(private readonly http: HttpClient) {}

  goals(): Observable<Goal[]> { return this.http.get<Goal[]>(`${this.api}/goals`); }
  createGoal(data: Omit<Goal, 'id' | 'user_id'>): Observable<Goal> { return this.http.post<Goal>(`${this.api}/goals`, data); }
  deleteGoal(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/goals/${id}`); }
  records(): Observable<PersonalRecord[]> { return this.http.get<PersonalRecord[]>(`${this.api}/records`); }
  createRecord(data: Omit<PersonalRecord, 'id' | 'user_id' | 'achieved_at'>): Observable<PersonalRecord> { return this.http.post<PersonalRecord>(`${this.api}/records`, data); }
}
