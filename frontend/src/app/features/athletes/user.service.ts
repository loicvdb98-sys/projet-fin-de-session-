/**
 * Service Angular pour le profil utilisateur : récupération du compte
 * courant (gardé en mémoire), liste des sportifs suivis par un coach, et
 * mise à jour du profil.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, of, shareReplay, tap } from 'rxjs';
import { API_URL } from '@core/api.config';

export interface User {
  id: number; email: string; full_name: string; role: string; is_active: boolean;
}

/** Gère la lecture/écriture du profil utilisateur. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = `${API_URL}/users`;
  private me$?: Observable<User>;
  private currentId?: number;
  /** Émet le compte connecté quand son profil vient d'être modifié (ex. nom affiché dans le menu). */
  readonly currentUserChanged$ = new Subject<User>();
  constructor(private readonly http: HttpClient) {}

  /**
   * Profil de l'utilisateur connecté. Presque chaque page en a besoin (rôle, id) : il n'est
   * demandé qu'une fois au serveur puis gardé en mémoire, jusqu'à la prochaine connexion
   * ou déconnexion (clearCache). En cas d'échec, l'appel suivant interroge à nouveau le serveur.
   */
  me(): Observable<User> {
    this.me$ ??= this.http.get<User>(`${this.api}/me`).pipe(
      tap((user) => (this.currentId = user.id)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.me$;
  }

  /** Oublie le profil gardé en mémoire (appelé à la connexion et à la déconnexion). */
  clearCache(): void {
    this.me$ = undefined;
    this.currentId = undefined;
  }

  /** Liste des sportifs visibles par un coach. */
  athletes(): Observable<User[]> { return this.http.get<User[]>(`${this.api}/athletes`); }

  /** Liste tous les comptes (réservé admin, pour la gestion des comptes). */
  list(): Observable<User[]> { return this.http.get<User[]>(`${this.api}/`); }

  /** Met à jour un sous-ensemble éditable du profil (nom, rôle, statut actif). */
  update(id: number, data: Partial<Pick<User, 'full_name' | 'role' | 'is_active'>>): Observable<User> {
    return this.http.patch<User>(`${this.api}/${id}`, data).pipe(
      tap((user) => {
        if (user.id !== this.currentId) return;
        this.me$ = of(user);
        this.currentUserChanged$.next(user);
      })
    );
  }
}
