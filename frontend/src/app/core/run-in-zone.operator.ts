/**
 * Opérateur RxJS garantissant que la vue se rafraîchit après chaque émission
 * (next/error/complete), même si le mécanisme normal d'Angular ne s'en charge
 * pas tout seul.
 *
 * `NgZone.run()` seul ne suffit pas ici : il exécute bien le callback, mais la
 * détection de changements n'est normalement déclenchée qu'indirectement,
 * quand zone.js constate que la zone est redevenue "stable" (plus de tâches
 * async en attente). Ce mécanisme dépend du monkey-patching que zone.js pose
 * sur setTimeout/XHR/fetch/Promise au démarrage - et dans le navigateur de cet
 * utilisateur, quelque chose empêche cette notification d'arriver jusqu'à
 * Angular (le state se met bien à jour en mémoire, mais la vue ne se
 * redessine jamais, y compris pour un simple setInterval de test).
 *
 * On contourne donc entièrement ce mécanisme : après avoir exécuté le
 * callback dans la zone, on appelle explicitement ApplicationRef.tick() pour
 * forcer une détection de changements globale, sans dépendre d'aucune
 * notification automatique de zone.js.
 */
import { ApplicationRef, NgZone } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';

export function runInZone<T>(zone: NgZone, appRef: ApplicationRef): OperatorFunction<T, T> {
  return (source: Observable<T>) => new Observable<T>((observer) => source.subscribe({
    next: (value) => zone.run(() => { observer.next(value); tick(appRef); }),
    error: (error) => zone.run(() => { observer.error(error); tick(appRef); }),
    complete: () => zone.run(() => { observer.complete(); tick(appRef); })
  }));
}

/** ApplicationRef.tick() lève une erreur s'il est appelé pendant qu'un tick est déjà en cours (ex : erreur relancée en cascade) - on l'ignore alors sans casser le flux. */
function tick(appRef: ApplicationRef): void {
  try {
    appRef.tick();
  } catch {
    /* un tick est déjà en cours plus haut dans la pile - il rafraîchira la vue de toute façon */
  }
}
