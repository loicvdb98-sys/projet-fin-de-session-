/**
 * Titre de l'onglet du navigateur : « <titre de la page> · SportPlan », à partir de la
 * propriété `title` de chaque route (voir app.routes.ts), ou « SportPlan » à défaut.
 */
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class SportPlanTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    this.title.setTitle(pageTitle ? `${pageTitle} · SportPlan` : 'SportPlan');
  }
}
