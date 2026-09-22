/**
 * Configuration racine de l'application Angular (bootstrap standalone) :
 * routeur, client HTTP avec intercepteur d'authentification, et animations.
 *
 * `provideZoneChangeDetection` est requis explicitement : depuis Angular 20+,
 * `bootstrapApplication` démarre en mode zoneless par défaut (NoopNgZone) si
 * rien ne demande le contraire, même si zone.js est bien présent dans les
 * polyfills. Sans cet appel, aucune mutation de propriété classique dans un
 * callback asynchrone (HTTP, setInterval...) ne déclenche de re-rendu - ce
 * qui provoquait des pages bloquées indéfiniment sur leur état "Chargement…"
 * bien que les données arrivaient correctement.
 */
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from '@features/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync()
  ]
};
