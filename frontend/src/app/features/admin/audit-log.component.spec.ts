import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuditLogComponent } from './audit-log.component';
import { AuditEvent, AuditService } from './audit.service';

const HOUR = 60 * 60 * 1000;
const event = (id: number, action: string, hoursAgo: number, extra: Partial<AuditEvent> = {}): AuditEvent => ({
  id, action, created_at: new Date(Date.now() - hoursAgo * HOUR).toISOString(),
  actor_id: null, actor_name: null, target_user_id: null, target_name: null, details: null, ip: '127.0.0.1', ...extra,
});

function setup(events: AuditEvent[]): AuditLogComponent {
  TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuditService, useValue: { list: () => of(events) } }] });
  return TestBed.createComponent(AuditLogComponent).componentInstance;
}

describe('AuditLogComponent', () => {
  const events = [
    event(5, 'compte_bloque', 1, { details: 'lea@example.com', target_user_id: 3, target_name: 'Léa Martin' }),
    event(4, 'connexion_refusee', 2, { details: 'lea@example.com', target_user_id: 3, target_name: 'Léa Martin' }),
    event(3, 'role_modifie', 30, { actor_id: 1, actor_name: 'Admin', target_user_id: 3, target_name: 'Léa Martin', details: 'sportif → coach' }),
    event(2, 'connexion_refusee', 50, { details: 'inconnu@example.com' }),
    event(1, 'connexion', 24 * 10, { actor_id: 1, actor_name: 'Admin' }),
  ];

  it('groups events by category in the rail', () => {
    const component = setup(events);

    expect(component.eventsOf('all')).toHaveLength(5);
    expect(component.eventsOf('failures').map((item) => item.id)).toEqual([5, 4, 2]);
    expect(component.eventsOf('accounts').map((item) => item.id)).toEqual([3]);
    component.selectedKey = 'alerts';
    expect(component.visibleEvents.map((item) => item.id)).toEqual([5]);
  });

  it('counts recent events for the summary cards', () => {
    const component = setup(events);

    expect(component.countSince(7 * 24)).toBe(4);
    expect(component.countSince(24, ['connexion_refusee'])).toBe(1);
  });

  it('describes who did what to which account', () => {
    const component = setup(events);

    expect(component.describe(events[2])).toBe('par Admin · compte Léa Martin · sportif → coach');
    expect(component.describe(events[1])).toBe('compte Léa Martin · mot de passe incorrect');
    expect(component.describe(events[3])).toBe('inconnu@example.com · adresse inconnue');
    expect(component.meta('vol_jeton_detecte')).toEqual({ label: 'Vol de jeton détecté', severity: 'danger' });
  });
});
