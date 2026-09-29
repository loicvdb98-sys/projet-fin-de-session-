/**
 * Service Angular gérant l'authentification : connexion, inscription,
 * changement de mot de passe, renouvellement du jeton d'accès, déconnexion
 * et stockage des tokens/rôle de l'utilisateur dans le localStorage.
 */
import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { API_URL } from '@core/api.config';
import { UserService } from '@features/athletes/user.service';

export interface LoginResponse { access_token: string; refresh_token: string; token_type: string; }
/** L'inscription publique ne crée que des comptes sportif (le serveur refuse tout autre rôle). */
export interface RegisterRequest { email: string; full_name: string; password: string; role: 'sportif'; }

/** Source de vérité pour l'état de connexion et le rôle de l'utilisateur courant. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = API_URL;
  readonly isAuthenticated = signal(Boolean(localStorage.getItem('access_token')));
  /** Renouvellement en cours, partagé par toutes les requêtes qui échouent en même temps. */
  private refreshInFlight?: Observable<string>;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly userService: UserService
  ) {}

  /**
   * Authentifie l'utilisateur (format x-www-form-urlencoded attendu par FastAPI/OAuth2),
   * stocke les tokens puis récupère le profil pour connaître son rôle réel.
   */
  login(email: string, password: string): Observable<LoginResponse> {
    const body = new HttpParams().set('username', email).set('password', password);
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        this.isAuthenticated.set(true);
      }),
      // Le rôle vient toujours du profil renvoyé par le serveur, jamais d'une supposition côté client.
      switchMap((response) => this.userService.me().pipe(
        tap((user) => localStorage.setItem('user_role', user.role)),
        map(() => response)
      ))
    );
  }

  /** Crée un nouveau compte (rôle sportif ou coach) ; ne connecte pas automatiquement. */
  register(data: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/auth/register`, data);
  }

  /** Change le mot de passe de l'utilisateur connecté après vérification du mot de passe actuel. */
  changePassword(current_password: string, new_password: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/change-password`, { current_password, new_password });
  }

  /**
   * Échange le refresh token contre une nouvelle paire de jetons (POST /auth/refresh) et
   * renvoie le nouveau jeton d'accès. Le serveur applique une rotation (l'ancien refresh
   * token est révoqué) : les requêtes qui échouent en même temps partagent donc un seul
   * appel, sinon la seconde présenterait un jeton déjà révoqué.
   */
  refreshAccessToken(): Observable<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return throwError(() => new Error('Aucun refresh token'));
    this.refreshInFlight ??= this.http.post<LoginResponse>(`${this.apiUrl}/auth/refresh`, { refresh_token: refreshToken }).pipe(
      map((response) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        return response.access_token;
      }),
      finalize(() => { this.refreshInFlight = undefined; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.refreshInFlight;
  }

  /**
   * Révoque le refresh token côté serveur (sans attendre la réponse), purge les
   * informations d'authentification locales et redirige vers l'écran de connexion.
   */
  logout(): void {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) this.http.post(`${this.apiUrl}/auth/logout`, { refresh_token: refreshToken }).subscribe({ error: () => undefined });
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    this.isAuthenticated.set(false);
    void this.router.navigate(['/login']);
  }

  /** Indique si l'utilisateur connecté a un rôle donnant accès aux écrans de gestion. */
  isCoachOrAdmin(): boolean {
    const role = localStorage.getItem('user_role');
    return role === 'coach' || role === 'admin';
  }

  /** Indique si l'utilisateur connecté est administrateur (gestion des comptes). */
  isAdmin(): boolean {
    return localStorage.getItem('user_role') === 'admin';
  }
}
