import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppNotification, NotificationService } from './notification.service';

const API = 'http://localhost:8000/notifications';
const note = (id: number, is_read = false): AppNotification => ({ id, user_id: 1, title: `Notification ${id}`, message: '…', kind: 'info', is_read, created_at: '' });

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;
  let arrived: AppNotification[][];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
    arrived = [];
    service.arrived.subscribe((items) => arrived.push(items));
  });

  afterEach(() => http.verify());

  it('uses the first reading as a reference, then announces new unread notifications', () => {
    service.refreshUnreadCount();
    http.expectOne(API).flush([note(2), note(1, true)]);
    expect(arrived).toEqual([]);
    expect(service.unreadCount()).toBe(1);

    service.refreshUnreadCount();
    http.expectOne(API).flush([note(4), note(3, true), note(2), note(1, true)]);

    expect(arrived.map((items) => items.map((item) => item.id))).toEqual([[4]]);
    expect(service.unreadCount()).toBe(2);
  });

  it('forgets the previous account after a reset', () => {
    service.refreshUnreadCount();
    http.expectOne(API).flush([note(5)]);

    service.reset();
    service.refreshUnreadCount();
    http.expectOne(API).flush([note(9)]);

    expect(arrived).toEqual([]);
    expect(service.unreadCount()).toBe(1);
  });
});
