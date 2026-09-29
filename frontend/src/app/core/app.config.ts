/**
 * Configuration racine de l'application Angular (bootstrap standalone) :
 * routeur (retour en haut de page à chaque navigation), client HTTP avec
 * intercepteur d'authentification, animations, et
 * langue française pour les pipes de date et de nombre (« septembre », « 80,6 »).
 *
 * `provideZoneChangeDetection` est requis explicitement : depuis Angular 20+,
 * `bootstrapApplication` démarre en mode zoneless par défaut (NoopNgZone) si
 * rien ne demande le contraire, même si zone.js est bien présent dans les
 * polyfills. Sans cet appel, aucune mutation de propriété classique dans un
 * callback asynchrone (HTTP, setInterval...) ne déclenche de re-rendu - ce
 * qui provoquait des pages bloquées indéfiniment sur leur état "Chargement…"
 * bien que les données arrivaient correctement.
 */
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { SportPlanTitleStrategy } from './title.strategy';
import { authInterceptor } from '@features/auth/auth.interceptor';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Chaque nouvelle page s'ouvre en haut ; le bouton Retour restaure la position précédente.
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    { provide: TitleStrategy, useClass: SportPlanTitleStrategy },
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync()
  ]
};
