/**
 * Service Angular gérant le thème clair/sombre de l'application : persistance
 * dans le localStorage, détection de la préférence système et application
 * au document via l'attribut `data-theme`.
 */
import { DOCUMENT } from '@angular/common';
import { Injectable, signal, inject } from '@angular/core';

export type Theme = 'light' | 'dark';

/** Centralise l'état du thème courant et sa persistance entre les sessions. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'sportplan-theme';
  readonly theme = signal<Theme>(this.initialTheme());

  constructor() {
    this.apply(this.theme());
  }

  /** Bascule entre thème clair et sombre, et mémorise le choix pour les prochaines visites. */
  toggle(): void {
    const next: Theme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    localStorage.setItem(this.storageKey, next);
    this.apply(next);
  }

  /** Thème au démarrage : préférence sauvegardée, sinon préférence système du navigateur. */
  private initialTheme(): Theme {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /** Répercute le thème sur le DOM (attribut data-theme + color-scheme natif du navigateur). */
  private apply(theme: Theme): void {
    this.document.documentElement.dataset['theme'] = theme;
    this.document.documentElement.style.colorScheme = theme;
  }
}
