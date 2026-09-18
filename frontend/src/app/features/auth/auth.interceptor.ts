/**
 * Intercepteur HTTP global : ajoute le token Bearer à chaque requête sortante,
 * déconnecte automatiquement l'utilisateur sur une réponse 401, et affiche
 * un toast d'erreur générique pour les échecs de chargement (GET) silencieux.
 */
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from '@shared/services/toast.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem('access_token');
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (token && error.status === 401) {
          auth.logout();
        } else if (request.method === 'GET' && error.status !== 401) {
          // Les échecs de lecture (GET) n'ont sinon aucun retour visuel nulle part dans l'app.
          // Les actions (POST/PATCH/DELETE) gèrent déjà leur propre message au niveau du composant.
          toast.error(
            error.status === 0
              ? 'Le serveur est indisponible. Réessayez dans un instant.'
              : 'Une erreur est survenue lors du chargement des données.'
          );
        }
      }
      return throwError(() => error);
    })
  );
};
