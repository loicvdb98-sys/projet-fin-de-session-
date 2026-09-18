/**
 * Service Angular gérant les notifications toast affichées à l'utilisateur :
 * création, disparition automatique, et report d'un message via sessionStorage
 * pour l'afficher juste après un rechargement de page.
 */
import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast { id: number; message: string; kind: ToastKind; }

const STORAGE_KEY = 'pending_toast';

/** File d'attente réactive des toasts actuellement affichés. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  constructor() {
    // Si un toast a été programmé avant un location.reload() (via showOnNextLoad),
    // on le récupère et l'affiche une seule fois au démarrage du service.
    const pending = sessionStorage.getItem(STORAGE_KEY);
    if (pending) {
      sessionStorage.removeItem(STORAGE_KEY);
      const { message, kind } = JSON.parse(pending) as { message: string; kind: ToastKind };
      this.show(message, kind);
    }
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error'); }
  info(message: string): void { this.show(message, 'info'); }

  /** Affiche le message après le prochain chargement de page (à utiliser juste avant un location.reload()). */
  showOnNextLoad(message: string, kind: ToastKind = 'success'): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ message, kind }));
  }

  /** Ajoute un toast à la pile et le retire automatiquement après 4 secondes. */
  show(message: string, kind: ToastKind = 'info'): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), 4000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
