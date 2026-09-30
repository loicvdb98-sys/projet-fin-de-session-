/**
 * Écran admin « Journal d'activité », au style « module » : un résumé chiffré, un rail de
 * catégories (connexions, échecs et blocages, comptes, mots de passe, alertes) et la liste
 * des événements de la catégorie choisie, du plus récent au plus ancien.
 */
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuditEvent, AuditService } from './audit.service';
import { markForCheck } from '@core/mark-for-check.operator';

type Severity = 'info' | 'success' | 'warning' | 'danger';

/** Libellé et gravité de chaque type d'événement enregistré par l'API. */
export const AUDIT_ACTIONS: Record<string, { label: string; severity: Severity }> = {
  connexion: { label: 'Connexion', severity: 'success' },
  connexion_refusee: { label: 'Connexion refusée', severity: 'warning' },
  compte_bloque: { label: 'Compte bloqué 15 minutes', severity: 'danger' },
  inscription: { label: 'Nouveau compte', severity: 'success' },
  deconnexion_partout: { label: 'Déconnexion de tous les appareils', severity: 'info' },
  mot_de_passe_change: { label: 'Mot de passe changé', severity: 'info' },
  reinitialisation_demandee: { label: 'Lien de réinitialisation demandé', severity: 'info' },
  mot_de_passe_reinitialise: { label: 'Mot de passe réinitialisé', severity: 'warning' },
  vol_jeton_detecte: { label: 'Vol de jeton détecté', severity: 'danger' },
  role_modifie: { label: 'Rôle modifié', severity: 'warning' },
  compte_desactive: { label: 'Compte désactivé', severity: 'danger' },
  compte_reactive: { label: 'Compte réactivé', severity: 'success' },
};

/** Catégories du rail : chacune regroupe plusieurs types d'événements. */
export const AUDIT_CATEGORIES: { key: string; label: string; tint: string; actions: string[] | null }[] = [
  { key: 'all', label: 'Tous les événements', tint: 'c-primary', actions: null },
  { key: 'logins', label: 'Connexions', tint: 'c-success', actions: ['connexion', 'inscription', 'deconnexion_partout'] },
  { key: 'failures', label: 'Échecs et blocages', tint: 'c-warning', actions: ['connexion_refusee', 'compte_bloque'] },
  { key: 'accounts', label: 'Comptes', tint: 'c-info', actions: ['role_modifie', 'compte_desactive', 'compte_reactive'] },
  { key: 'passwords', label: 'Mots de passe', tint: 'c-secondary', actions: ['mot_de_passe_change', 'reinitialisation_demandee', 'mot_de_passe_reinitialise'] },
  { key: 'alerts', label: 'Alertes', tint: 'c-danger', actions: ['compte_bloque', 'vol_jeton_detecte', 'compte_desactive'] },
];

const HOUR_MS = 60 * 60 * 1000;

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule],
  template: `
    <section class="page module-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">ESPACE ADMIN</p>
          <h1>Journal d’activité</h1>
          <p class="text-secondary">Connexions, blocages, changements de rôle et de mot de passe : les 180 derniers jours.</p>
        </div>
        <a mat-stroked-button class="teal-outline" routerLink="/admin/users">Gestion des comptes</a>
      </div>

      @if (loading) {
        <p class="text-secondary">Chargement du journal…</p>
      } @else if (loadError) {
        <p class="empty-state">Impossible de charger le journal. <button mat-button class="teal-action" (click)="load()">Réessayer</button></p>
      } @else {
        <div class="cards">
          <mat-card class="stat-card accent">
            <mat-card-title>Événements</mat-card-title>
            <strong class="stat-value">{{ countSince(7 * 24) }}</strong>
            <p class="text-secondary">sur les 7 derniers jours</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Connexions refusées</mat-card-title>
            <strong class="stat-value">{{ countSince(24, ['connexion_refusee']) }}</strong>
            <p class="text-secondary">sur les dernières 24 h</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Alertes</mat-card-title>
            <strong class="stat-value">{{ countSince(7 * 24, ['compte_bloque', 'vol_jeton_detecte']) }}</strong>
            <p class="text-secondary">blocages et vols de jeton (7 j)</p>
          </mat-card>
        </div>

        <div class="module-shell">
          <nav class="module-rail" aria-label="Catégories du journal">
            @for (category of categories; track category.key) {
              <button type="button" class="module-rail-item" [class]="category.tint" [class.active]="category.key === selectedKey"
                [attr.aria-current]="category.key === selectedKey ? 'true' : null" (click)="selectedKey = category.key">
                <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg></span>
                <span class="module-rail-text">
                  <span class="module-rail-label">{{ category.label }}</span>
                  <small class="module-rail-sublabel">{{ eventsOf(category.key).length }} événement(s)</small>
                </span>
              </button>
            }
          </nav>

          <div class="module-detail">
            <!-- La liste défile dans la carte : tabindex="0" permet de la faire défiler au clavier. -->
            <div class="module-detail-card" [class]="selectedCategory.tint" tabindex="0" role="region" [attr.aria-label]="'Événements : ' + selectedCategory.label">
              <div class="module-detail-header">
                <span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg></span>
                <div><p class="eyebrow">JOURNAL</p><h2>{{ selectedCategory.label }}</h2></div>
                <span class="module-badge">{{ visibleEvents.length }}</span>
              </div>
              @if (visibleEvents.length) {
                <ol class="audit-list">
                  @for (event of visibleEvents; track event.id) {
                    <li class="audit-row" [class]="'sev-' + meta(event.action).severity">
                      <span class="audit-dot" aria-hidden="true"></span>
                      <span class="audit-body">
                        <strong>{{ meta(event.action).label }}</strong>
                        <small>{{ describe(event) }}</small>
                      </span>
                      <span class="audit-when">
                        <time [attr.datetime]="event.created_at">{{ event.created_at | date:'dd/MM/yyyy HH:mm' }}</time>
                        @if (event.ip) { <small>IP {{ event.ip }}</small> }
                      </span>
                    </li>
                  }
                </ol>
              } @else {
                <p class="empty-state module-empty">Aucun événement dans cette catégorie.</p>
              }
            </div>
          </div>
        </div>
      }
    </section>
  `
})
export class AuditLogComponent {
  private readonly service = inject(AuditService);
  private readonly cd = inject(ChangeDetectorRef);
  readonly categories = AUDIT_CATEGORIES;
  events: AuditEvent[] = [];
  selectedKey = 'all';
  loading = true;
  loadError = false;

  constructor() { this.load(); }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.service.list().pipe(markForCheck(this.cd)).subscribe({
      next: (events) => { this.events = events; this.loading = false; },
      error: () => { this.loading = false; this.loadError = true; }
    });
  }

  get selectedCategory() {
    return this.categories.find((category) => category.key === this.selectedKey) ?? this.categories[0];
  }

  get visibleEvents(): AuditEvent[] { return this.eventsOf(this.selectedKey); }

  /** Événements d'une catégorie du rail. */
  eventsOf(key: string): AuditEvent[] {
    const actions = this.categories.find((category) => category.key === key)?.actions;
    return actions ? this.events.filter((event) => actions.includes(event.action)) : this.events;
  }

  /** Nombre d'événements (éventuellement d'un type donné) sur les dernières heures. */
  countSince(hours: number, actions?: string[], now = Date.now()): number {
    return this.events.filter((event) => now - new Date(event.created_at).getTime() <= hours * HOUR_MS
      && (!actions || actions.includes(event.action))).length;
  }

  meta(action: string): { label: string; severity: Severity } {
    return AUDIT_ACTIONS[action] ?? { label: action, severity: 'info' };
  }

  /** Phrase courte : qui a fait l'action, sur quel compte, et le détail éventuel. */
  describe(event: AuditEvent): string {
    const parts: string[] = [];
    if (event.actor_name) parts.push(`par ${event.actor_name}`);
    if (event.target_name && event.target_user_id !== event.actor_id) parts.push(`compte ${event.target_name}`);
    if (event.details && !(event.action === 'connexion_refusee' && event.target_name)) parts.push(event.details);
    if (event.action === 'connexion_refusee' && event.target_name) parts.push('mot de passe incorrect');
    if (event.action === 'connexion_refusee' && !event.target_name) parts.push('adresse inconnue');
    return parts.join(' · ') || '—';
  }
}
