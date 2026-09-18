import { Component, inject } from '@angular/core';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (toast of svc.toasts(); track toast.id) {
        <div class="toast" [class]="'k-' + toast.kind">
          <span class="toast-icon" aria-hidden="true">
            @switch (toast.kind) {
              @case ('success') { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></svg> }
              @case ('error') { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg> }
              @default { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg> }
            }
          </span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button type="button" class="toast-close" (click)="svc.dismiss(toast.id)" aria-label="Fermer la notification">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastContainerComponent {
  readonly svc = inject(ToastService);
}
