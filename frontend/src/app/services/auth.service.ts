import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface LoginResponse { access_token: string; refresh_token: string; token_type: string; }
export interface RegisterRequest { email: string; full_name: string; password: string; role: 'sportif' | 'coach'; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:8001';
  readonly isAuthenticated = signal(Boolean(localStorage.getItem('access_token')));

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  login(email: string, password: string): Observable<LoginResponse> {
    const body = new HttpParams().set('username', email).set('password', password);
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        this.isAuthenticated.set(true);
      })
    );
  }

  register(data: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/auth/register`, data);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.isAuthenticated.set(false);
    void this.router.navigate(['/login']);
  }
}
