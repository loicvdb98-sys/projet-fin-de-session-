import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [ToastService] });
  });

  it('adds a toast for each severity helper', () => {
    const service = TestBed.inject(ToastService);

    service.success('Objectif créé.');
    service.error('Impossible de supprimer.');

    const toasts = service.toasts();
    expect(toasts.length).toBe(2);
    expect(toasts[0].message).toBe('Objectif créé.');
    expect(toasts[0].kind).toBe('success');
    expect(toasts[1].message).toBe('Impossible de supprimer.');
    expect(toasts[1].kind).toBe('error');
  });

  it('removes a toast on dismiss', () => {
    const service = TestBed.inject(ToastService);
    service.info('Une info.');
    const [toast] = service.toasts();

    service.dismiss(toast.id);

    expect(service.toasts().length).toBe(0);
  });

  it('auto-dismisses a toast after 4 seconds', () => {
    vi.useFakeTimers();
    try {
      const service = TestBed.inject(ToastService);
      service.success('Ça part tout seul.');

      expect(service.toasts().length).toBe(1);
      vi.advanceTimersByTime(4000);

      expect(service.toasts().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('replays a toast stashed before a page reload, then clears it', () => {
    sessionStorage.setItem('pending_toast', JSON.stringify({ message: 'Programme créé.', kind: 'success' }));

    const service = TestBed.inject(ToastService);

    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Programme créé.');
    expect(sessionStorage.getItem('pending_toast')).toBeNull();
  });

  it('does nothing on construction when no toast is pending', () => {
    const service = TestBed.inject(ToastService);

    expect(service.toasts().length).toBe(0);
  });
});
