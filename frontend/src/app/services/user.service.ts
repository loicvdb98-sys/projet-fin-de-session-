import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User { id: number; email: string; full_name: string; role: string; is_active: boolean; }
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = 'http://localhost:8001/users';
  constructor(private readonly http: HttpClient) {}
  me(): Observable<User> { return this.http.get<User>(`${this.api}/me`); }
  update(id: number, data: Partial<Pick<User, 'full_name' | 'role' | 'is_active'>>): Observable<User> {
    return this.http.patch<User>(`${this.api}/${id}`, data);
  }
}
