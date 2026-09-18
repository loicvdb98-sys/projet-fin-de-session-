import { Component, signal } from '@angular/core';
import { DEMO_MODE } from '@shared/data/demo-data';

const STORAGE_KEY = 'demo_notice_dismissed';

@Component({
  selector: 'app-demo-notice',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="demo-notice" role="status">
        <span class="demo-notice-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>
        </span>
        <span class="demo-notice-body">
          <strong>Mode démonstration</strong>
          <span>Certaines données affichées sont locales et temporaires, pratiques pour la présentation.</span>
        </span>
        <button type="button" class="demo-notice-close" (click)="dismiss()" aria-label="Fermer ce message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
    }
  `
})
export class DemoNoticeComponent {
  readonly visible = signal(DEMO_MODE && sessionStorage.getItem(STORAGE_KEY) !== '1');

  dismiss(): void {
    sessionStorage.setItem(STORAGE_KEY, '1');
    this.visible.set(false);
  }
}
