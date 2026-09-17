import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast { id: number; message: string; kind: ToastKind; }

const STORAGE_KEY = 'pending_toast';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  constructor() {
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

  show(message: string, kind: ToastKind = 'info'): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), 4000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
