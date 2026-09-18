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

  it('sends password changes to the protected endpoint', () => {
    service.changePassword('OldPassword2026!', 'NewPassword2026!').subscribe();
    const request = http.expectOne('http://localhost:8000/auth/change-password');

    expect(request.request.body).toEqual({
      current_password: 'OldPassword2026!',
      new_password: 'NewPassword2026!'
    });
    request.flush(null);
  });
});
