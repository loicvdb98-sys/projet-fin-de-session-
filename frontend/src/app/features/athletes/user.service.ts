/**
 * Service Angular pour le profil utilisateur : récupération du compte
 * courant, liste des sportifs suivis par un coach, et mise à jour du profil.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { API_URL } from '@core/api.config';
import { DEMO_ATHLETES, DEMO_MODE } from '@shared/data/demo-data';

export interface User {
  id: number; email: string; full_name: string; role: string; is_active: boolean;
  specialty?: string; weekly_sessions?: number; progress?: number; goal?: string; last_activity?: string;
}

/** Gère la lecture/écriture du profil utilisateur, réel (API) ou simulé (DEMO_MODE). */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = `${API_URL}/users`;
  constructor(private readonly http: HttpClient) {}

  /** Profil de l'utilisateur connecté (dérivé de l'email de connexion en mode démo). */
  me(): Observable<User> { return DEMO_MODE ? of(this.demoCurrentUser()) : this.http.get<User>(`${this.api}/me`); }

  /** Liste des sportifs visibles par un coach. */
  athletes(): Observable<User[]> { return DEMO_MODE ? of(DEMO_ATHLETES) : this.http.get<User[]>(`${this.api}/athletes`); }

  /** Liste tous les comptes (réservé admin, pour la gestion des comptes). */
  list(): Observable<User[]> { return this.http.get<User[]>(`${this.api}/`); }

  /** Met à jour un sous-ensemble éditable du profil (nom, rôle, statut actif). */
  update(id: number, data: Partial<Pick<User, 'full_name' | 'role' | 'is_active'>>): Observable<User> {
    return DEMO_MODE ? of({ ...this.demoCurrentUser(), ...data }) : this.http.patch<User>(`${this.api}/${id}`, data);
  }

  /** Construit le profil visuel depuis l'adresse saisie à la connexion. */
  private demoCurrentUser(): User {
    const email = localStorage.getItem('demo_user_email') || 'coach.demo@sportplan.dev';
    const identifier = email.split('@')[0] || 'sportif';
    const fullName = identifier
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const role = identifier.includes('admin') ? 'admin' : identifier.includes('coach') ? 'coach' : 'sportif';
    return {
      id: role === 'coach' ? 400 : role === 'admin' ? 1 : 2,
      email,
      full_name: fullName || 'Sportif',
      role,
      is_active: true,
    };
  }
}
