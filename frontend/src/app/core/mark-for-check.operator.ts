/**
 * Opérateur RxJS à ajouter sur les `.subscribe()` qui modifient une propriété
 * de classe "à la main" (hors signal, hors pipe async) : il déclenche
 * `ChangeDetectorRef.markForCheck()` après chaque émission pour garantir que
 * la vue se rafraîchisse.
 *
 * Nécessaire dans cette version d'Angular : même avec `provideZoneChangeDetection()`
 * (zone.js actif, callback exécuté dans la bonne zone), le planificateur de
 * détection de changements ne revisite que les vues explicitement marquées -
 * une simple affectation `this.x = valeur` dans un callback de souscription
 * ne suffit plus à déclencher un nouveau rendu.
 */
import { ChangeDetectorRef } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';

export function markForCheck<T>(cd: ChangeDetectorRef): OperatorFunction<T, T> {
  return (source: Observable<T>) => new Observable<T>((observer) => source.subscribe({
    next: (value) => { observer.next(value); cd.markForCheck(); },
    error: (error) => { observer.error(error); cd.markForCheck(); },
    complete: () => { observer.complete(); cd.markForCheck(); }
  }));
}
