/**
 * Service Angular pour le profil utilisateur : récupération du compte
 * courant, liste des sportifs suivis par un coach, et mise à jour du profil.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface User {
  id: number; email: string; full_name: string; role: string; is_active: boolean;
}

/** Gère la lecture/écriture du profil utilisateur. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = `${API_URL}/users`;
  constructor(private readonly http: HttpClient) {}

  /** Profil de l'utilisateur connecté. */
  me(): Observable<User> { return this.http.get<User>(`${this.api}/me`); }

  /** Liste des sportifs visibles par un coach. */
  athletes(): Observable<User[]> { return this.http.get<User[]>(`${this.api}/athletes`); }

  /** Liste tous les comptes (réservé admin, pour la gestion des comptes). */
  list(): Observable<User[]> { return this.http.get<User[]>(`${this.api}/`); }

  /** Met à jour un sous-ensemble éditable du profil (nom, rôle, statut actif). */
  update(id: number, data: Partial<Pick<User, 'full_name' | 'role' | 'is_active'>>): Observable<User> {
    return this.http.patch<User>(`${this.api}/${id}`, data);
  }
}
