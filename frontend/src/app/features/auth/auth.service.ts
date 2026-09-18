import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, switchMap, tap } from 'rxjs';
import { API_URL } from '@core/api.config';
import { UserService } from '@features/athletes/user.service';

export interface LoginResponse { access_token: string; refresh_token: string; token_type: string; }
export interface RegisterRequest { email: string; full_name: string; password: string; role: 'sportif' | 'coach'; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = API_URL;
  readonly isAuthenticated = signal(Boolean(localStorage.getItem('access_token')));

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly userService: UserService
  ) {}

  login(email: string, password: string): Observable<LoginResponse> {
    const body = new HttpParams().set('username', email).set('password', password);
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        // Utilisé uniquement par les données visuelles locales de démonstration.
        localStorage.setItem('demo_user_email', email.trim().toLowerCase());
        this.isAuthenticated.set(true);
      }),
      // Le rôle vient toujours du profil renvoyé par le serveur, jamais d'une supposition côté client.
      switchMap((response) => this.userService.me().pipe(
        tap((user) => localStorage.setItem('user_role', user.role)),
        map(() => response)
      ))
    );
  }

  register(data: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/auth/register`, data);
  }

  changePassword(current_password: string, new_password: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/change-password`, { current_password, new_password });
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('demo_user_email');
    localStorage.removeItem('user_role');
    this.isAuthenticated.set(false);
    void this.router.navigate(['/login']);
  }

  isCoachOrAdmin(): boolean {
    const role = localStorage.getItem('user_role');
    return role === 'coach' || role === 'admin';
  }
}
