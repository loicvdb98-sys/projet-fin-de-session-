/**
 * Squelette de chargement des pages au style « module » : cartes de chiffres (facultatives),
 * rail et fiche en blocs gris animés, à la place du texte « Chargement… ». La page garde
 * ainsi sa forme pendant le chargement, sans saut de mise en page à l'arrivée des données.
 * Le texte `label` reste annoncé aux lecteurs d'écran. L'élément et son enveloppe sont en
 * `display: contents` : les cartes et le rail suivent la mise en page de la page (hauteur
 * d'écran), exactement comme le contenu qu'ils remplacent.
 */
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-module-skeleton',
  standalone: true,
  template: `
    <p class="visually-hidden" role="status">{{ label() }}</p>
    <div class="module-skeleton">
      @if (cards()) {
        <div class="cards" aria-hidden="true">
          @for (card of counter(cards()); track card) {
            <div class="stat-card skeleton-stat"><span class="skeleton-line" style="width:45%"></span><span class="skeleton-line" style="width:30%;height:1.6rem;margin-top:.6rem"></span></div>
          }
        </div>
      }
      <div class="module-shell" aria-hidden="true">
        <div class="module-rail">
          @for (item of counter(rows()); track item) {
            <div class="skeleton-rail-item"><span class="module-rail-icon skeleton-block"></span><span class="skeleton-rail-text"><span class="skeleton-line" style="width:75%"></span><span class="skeleton-line" style="width:45%;height:.6rem"></span></span></div>
          }
        </div>
        <div class="module-detail">
          <div class="module-detail-card skeleton-card">
            <div class="module-detail-header">
              <span class="module-icon skeleton-block"></span>
              <div><span class="skeleton-line" style="width:4rem"></span><span class="skeleton-line" style="width:9rem;height:1.3rem;margin-top:.5rem"></span></div>
            </div>
            <span class="skeleton-line" style="width:80%"></span>
            <span class="skeleton-line" style="width:55%"></span>
            <div class="skeleton-preview"><span class="skeleton-line"></span><span class="skeleton-line"></span><span class="skeleton-line" style="width:65%"></span></div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ModuleSkeletonComponent {
  /** Texte annoncé aux lecteurs d'écran (ex. « Chargement des séances… »). */
  readonly label = input('Chargement…');
  /** Nombre de cartes de chiffres à simuler (0 : aucune). */
  readonly cards = input(0);
  /** Nombre d'éléments simulés dans le rail. */
  readonly rows = input(5);

  counter(count: number): number[] { return Array.from({ length: count }, (_, index) => index); }
}
