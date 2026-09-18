/** Point d'entrée de l'application : démarre le composant racine en mode standalone. */
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/core/app.config';
import { AppComponent } from './app/core/app.component';

bootstrapApplication(AppComponent, appConfig).catch((error: unknown) => console.error(error));
