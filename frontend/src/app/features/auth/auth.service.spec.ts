import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores tokens after a successful login', () => {
    service.login('athlete@example.com', 'Password2026!').subscribe();
    const loginRequest = http.expectOne('http://localhost:8000/auth/login');
    loginRequest.flush({ access_token: 'access', refresh_token: 'refresh', token_type: 'bearer' });

    // Le login enchaîne sur /users/me pour connaître le rôle réel de l'utilisateur.
    const meRequest = http.expectOne('http://localhost:8000/users/me');
    meRequest.flush({ id: 1, email: 'athlete@example.com', full_name: 'Athlete', role: 'sportif', is_active: true });

    expect(localStorage.getItem('access_token')).toBe('access');
    expect(localStorage.getItem('refresh_token')).toBe('refresh');
    expect(localStorage.getItem('user_role')).toBe('sportif');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('sends password changes to the protected endpoint and keeps this device signed in', () => {
    localStorage.setItem('access_token', 'old-access');
    localStorage.setItem('refresh_token', 'old-refresh');
    service.changePassword('OldPassword2026!', 'NewPassword2026!').subscribe();
    const request = http.expectOne('http://localhost:8000/auth/change-password');

    expect(request.request.body).toEqual({
      current_password: 'OldPassword2026!',
      new_password: 'NewPassword2026!'
    });
    // Le serveur ferme les autres sessions et renvoie une nouvelle paire de jetons pour celle-ci.
    request.flush({ access_token: 'new-access', refresh_token: 'new-refresh', token_type: 'bearer' });

    expect(localStorage.getItem('access_token')).toBe('new-access');
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
  });

  it('closes every session then signs this device out', () => {
    localStorage.setItem('access_token', 'access');
    localStorage.setItem('refresh_token', 'refresh');
    service.isAuthenticated.set(true);
    service.logoutEverywhere().subscribe();

    http.expectOne('http://localhost:8000/auth/logout-all').flush(null, { status: 204, statusText: 'No Content' });
    // logout() révoque aussi le refresh token local, sans attendre la réponse.
    http.expectOne('http://localhost:8000/auth/logout').flush(null, { status: 204, statusText: 'No Content' });

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('asks for a reset link and returns the neutral server message', () => {
    let message = '';
    service.forgotPassword('alex@example.com').subscribe((value) => (message = value));
    const request = http.expectOne('http://localhost:8000/auth/forgot-password');

    expect(request.request.body).toEqual({ email: 'alex@example.com' });
    request.flush({ detail: 'Si un compte correspond à cette adresse, un lien vient d’être envoyé.' }, { status: 202, statusText: 'Accepted' });
    expect(message).toContain('Si un compte correspond');
  });

  it('sends the token and the new password to reset it', () => {
    service.resetPassword('jeton-du-lien-recu-par-email', 'NouveauDepart2026').subscribe();

    const request = http.expectOne('http://localhost:8000/auth/reset-password');
    expect(request.request.body).toEqual({ token: 'jeton-du-lien-recu-par-email', new_password: 'NouveauDepart2026' });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
