import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';

const API = 'http://localhost:8000';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'expired-access');
    localStorage.setItem('refresh_token', 'valid-refresh');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('renews an expired access token and replays the request once', () => {
    let result: unknown;
    http.get(`${API}/users/me`).subscribe((value) => (result = value));

    const first = backend.expectOne(`${API}/users/me`);
    expect(first.request.headers.get('Authorization')).toBe('Bearer expired-access');
    first.flush({ detail: 'Token invalide' }, { status: 401, statusText: 'Unauthorized' });

    const refresh = backend.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refresh_token: 'valid-refresh' });
    refresh.flush({ access_token: 'new-access', refresh_token: 'new-refresh', token_type: 'bearer' });

    const retry = backend.expectOne(`${API}/users/me`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush({ id: 1 });

    expect(result).toEqual({ id: 1 });
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
  });

  it('shares a single refresh call between requests failing at the same time', () => {
    http.get(`${API}/sessions/`).subscribe();
    http.get(`${API}/goals`).subscribe();
    backend.expectOne(`${API}/sessions/`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API}/goals`).flush(null, { status: 401, statusText: 'Unauthorized' });

    backend.expectOne(`${API}/auth/refresh`).flush({ access_token: 'new-access', refresh_token: 'new-refresh', token_type: 'bearer' });

    backend.expectOne(`${API}/sessions/`).flush([]);
    backend.expectOne(`${API}/goals`).flush([]);
  });

  it('logs out when the refresh token is rejected', () => {
    http.get(`${API}/users/me`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/users/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API}/auth/refresh`).flush({ detail: 'Refresh token invalide' }, { status: 401, statusText: 'Unauthorized' });

    // La déconnexion révoque le refresh token côté serveur puis vide le stockage local.
    backend.expectOne(`${API}/auth/logout`).flush(null);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
});
