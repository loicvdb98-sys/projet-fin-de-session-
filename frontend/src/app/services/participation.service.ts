import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface Participation { id: number; user_id: number; session_id: number; status: string; }
@Injectable({ providedIn: 'root' })
export class ParticipationService {
  private readonly api = 'http://localhost:8001/participations';
  constructor(private readonly http: HttpClient) {}
  list(): Observable<Participation[]> { return this.http.get<Participation[]>(`${this.api}/`); }
  create(user_id: number, session_id: number): Observable<Participation> { return this.http.post<Participation>(`${this.api}/`, { user_id, session_id }); }
  update(id: number, status: string): Observable<Participation> { return this.http.patch<Participation>(`${this.api}/${id}`, { status }); }
  remove(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/${id}`); }
}
