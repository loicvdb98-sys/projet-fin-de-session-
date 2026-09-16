import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { API_URL } from '../api.config';
import { DEMO_GOALS, DEMO_MODE, DEMO_RECORDS } from '../demo-data';

export interface Goal {
  id: number; user_id: number; title: string; metric: string; target_value: number;
  current_value: number; unit: string; due_date?: string; notes?: string;
}
export interface PersonalRecord {
  id: number; user_id: number; exercise_name: string; value: number; unit: string;
  achieved_at: string; notes?: string;
}

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly api = API_URL;
  constructor(private readonly http: HttpClient) {}
  goals(): Observable<Goal[]> { return DEMO_MODE ? of(DEMO_GOALS) : this.http.get<Goal[]>(`${this.api}/goals`); }
  createGoal(data: Omit<Goal, 'id' | 'user_id'>): Observable<Goal> { return this.http.post<Goal>(`${this.api}/goals`, data); }
  deleteGoal(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/goals/${id}`); }
  records(): Observable<PersonalRecord[]> { return DEMO_MODE ? of(DEMO_RECORDS) : this.http.get<PersonalRecord[]>(`${this.api}/records`); }
  createRecord(data: Omit<PersonalRecord, 'id' | 'user_id' | 'achieved_at'>): Observable<PersonalRecord> { return this.http.post<PersonalRecord>(`${this.api}/records`, data); }
}
