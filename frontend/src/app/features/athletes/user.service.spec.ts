import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { User, UserService } from './user.service';

const API = 'http://localhost:8000/users';
const ALEX: User = { id: 1, email: 'alex@example.com', full_name: 'Alex Sportif', role: 'sportif', is_active: true };

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks the server for the current user only once', () => {
    const received: User[] = [];
    service.me().subscribe((user) => received.push(user));
    service.me().subscribe((user) => received.push(user));
    http.expectOne(`${API}/me`).flush(ALEX);

    service.me().subscribe((user) => received.push(user));

    expect(received).toEqual([ALEX, ALEX, ALEX]);
  });

  it('asks again after the cache is cleared (sign in / sign out)', () => {
    service.me().subscribe();
    http.expectOne(`${API}/me`).flush(ALEX);

    service.clearCache();
    service.me().subscribe();

    http.expectOne(`${API}/me`).flush({ ...ALEX, id: 2 });
  });

  it('keeps the cached profile in sync after the user renames themself', () => {
    const changes: User[] = [];
    service.currentUserChanged$.subscribe((user) => changes.push(user));
    service.me().subscribe();
    http.expectOne(`${API}/me`).flush(ALEX);

    service.update(1, { full_name: 'Alex Martin' }).subscribe();
    http.expectOne(`${API}/1`).flush({ ...ALEX, full_name: 'Alex Martin' });

    let current: User | undefined;
    service.me().subscribe((user) => (current = user));
    expect(current?.full_name).toBe('Alex Martin');
    expect(changes.map((user) => user.full_name)).toEqual(['Alex Martin']);
  });

  it('does not touch the cached profile when an admin updates someone else', () => {
    service.me().subscribe();
    http.expectOne(`${API}/me`).flush({ ...ALEX, role: 'admin' });

    service.update(5, { role: 'coach' }).subscribe();
    http.expectOne(`${API}/5`).flush({ ...ALEX, id: 5, role: 'coach' });

    let current: User | undefined;
    service.me().subscribe((user) => (current = user));
    expect(current?.role).toBe('admin');
  });
});
