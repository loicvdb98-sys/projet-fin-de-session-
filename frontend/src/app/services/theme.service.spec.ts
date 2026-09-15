import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addListener: () => undefined, removeListener: () => undefined })
    });
    TestBed.configureTestingModule({ providers: [ThemeService] });
  });

  it('starts with a light theme when no preference is stored', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(TestBed.inject(DOCUMENT).documentElement.dataset['theme']).toBe('light');
  });

  it('toggles and persists the selected theme', () => {
    const service = TestBed.inject(ThemeService);

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('sportplan-theme')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});
