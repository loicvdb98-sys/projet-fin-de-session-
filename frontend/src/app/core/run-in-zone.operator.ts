/**
 * Opérateur RxJS garantissant que chaque émission (next/error/complete) s'exécute
 * à l'intérieur de la NgZone d'Angular, même si la source a émis en dehors (ex :
 * un callback réseau capturé par une extension de navigateur ou une autre librairie
 * qui échappe au monkey-patching de zone.js). Sans ça, la mise à jour de state est
 * bien effectuée en mémoire, mais la détection de changements d'Angular ne se
 * déclenche jamais et la vue ne se rafraîchit pas.
 */
import { NgZone } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';

export function runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
  return (source: Observable<T>) => new Observable<T>((observer) => source.subscribe({
    next: (value) => zone.run(() => observer.next(value)),
    error: (error) => zone.run(() => observer.error(error)),
    complete: () => zone.run(() => observer.complete())
  }));
}
