/**
 * Intercepteur HTTP global : ajoute le token Bearer à chaque requête sortante,
 * déconnecte automatiquement l'utilisateur sur une réponse 401, affiche un toast
 * d'erreur générique pour les échecs de chargement (GET) silencieux, et force
 * chaque réponse à s'exécuter dans la NgZone d'Angular (voir runInZone) pour que
 * la vue se rafraîchisse même si quelque chose côté navigateur fait échapper le
 * callback réseau au monkey-patching automatique de zone.js.
 */
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { NgZone, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from '@shared/services/toast.service';
import { runInZone } from '@core/run-in-zone.operator';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem('access_token');
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const zone = inject(NgZone);
  return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request).pipe(
    runInZone(zone),
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
