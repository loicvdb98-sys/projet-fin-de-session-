/**
 * Intercepteur HTTP global : ajoute le token Bearer à chaque requête sortante,
 * renouvelle le jeton d'accès expiré (refresh token) puis rejoue la requête une
 * fois, déconnecte l'utilisateur si ce renouvellement échoue, et affiche un toast
 * d'erreur générique pour les échecs de chargement (GET) silencieux.
 */
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from '@shared/services/toast.service';

/** Appels d'authentification : jamais de jeton ajouté, jamais de renouvellement automatique. */
const AUTH_ENDPOINT = /\/auth\/(login|register|refresh|logout|forgot-password|reset-password)$/;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const isAuthCall = AUTH_ENDPOINT.test(request.url);
  const token = localStorage.getItem('access_token');
  const withToken = (value: string | null): HttpRequest<unknown> =>
    value && !isAuthCall ? request.clone({ setHeaders: { Authorization: `Bearer ${value}` } }) : request;

  return next(withToken(token)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      if (token && !isAuthCall && error.status === 401) {
        // Jeton d'accès expiré (30 min) : on le renouvelle avec le refresh token (7 jours)
        // et on rejoue la requête ; si le renouvellement échoue, la session est terminée.
        return auth.refreshAccessToken().pipe(
          catchError(() => {
            auth.logout();
            return throwError(() => error);
          }),
          switchMap((newToken) => next(withToken(newToken)))
        );
      }
      if (request.method === 'GET' && error.status !== 401) {
        // Les échecs de lecture (GET) n'ont sinon aucun retour visuel nulle part dans l'app.
        // Les actions (POST/PATCH/DELETE) gèrent déjà leur propre message au niveau du composant.
        toast.error(
          error.status === 0
            ? 'Le serveur est indisponible. Réessayez dans un instant.'
            : 'Une erreur est survenue lors du chargement des données.'
        );
      }
      return throwError(() => error);
    })
  );
};
