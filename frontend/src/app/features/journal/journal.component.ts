import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { JournalService, TrainingJournal } from './journal.service';
import { SessionService, SportSession } from '@features/sessions/session.service';
import { ToastService } from '@shared/services/toast.service';
import { markForCheck } from '@core/mark-for-check.operator';

const MOOD_LABELS: Record<string, string> = { excellent: 'Excellente', bien: 'Bonne', moyen: 'Moyenne', difficile: 'Difficile' };

/**
 * Écran du journal d'entraînement, au même style « module » que les pages
 * Participations et Objectifs : un résumé chiffré, un rail (nouvelle entrée
 * puis historique des bilans) et le détail du bilan sélectionné, ou le
 * formulaire de bilan post-séance (fatigue, humeur, douleur, notes).
 */
@Component({
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <section class="page module-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">RÉCUPÉRATION</p>
          <h1>Journal d’entraînement</h1>
          <p class="text-secondary">Notez votre ressenti après chaque séance pour mieux comprendre votre progression.</p>
        </div>
      </div>

      @if (loading) {
        <p class="text-secondary">Chargement du journal…</p>
      } @else if (loadError) {
        <p class="empty-state">Impossible de charger votre journal. <button mat-button class="teal-action" (click)="load()">Réessayer</button></p>
      } @else {
        <div class="cards">
          <mat-card class="stat-card accent">
            <mat-card-title>Bilans enregistrés</mat-card-title>
            <strong class="stat-value">{{ journals.length }}</strong>
            <p class="text-secondary">entrée(s) dans le journal</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Fatigue moyenne</mat-card-title>
            <strong class="stat-value">{{ averageFatigue === null ? '—' : (averageFatigue | number:'1.0-1') }}</strong>
            <p class="text-secondary">sur 10 (1 = très frais)</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Humeur fréquente</mat-card-title>
            <strong class="stat-value">{{ frequentMood ?? '—' }}</strong>
            <p class="text-secondary">sur l’ensemble des bilans</p>
          </mat-card>
        </div>

        <div class="module-shell">
          <nav class="module-rail" aria-label="Journal d'entraînement">
            <p class="app-rail-section">Bilan</p>
            <button type="button" class="module-rail-item c-primary" [class.active]="selectedId === null" [attr.aria-current]="selectedId === null ? 'true' : null" (click)="selectedId = null">
              <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></span>
              <span class="module-rail-label">Nouvelle entrée</span>
            </button>
            @if (journals.length) {
              <p class="app-rail-section">Historique</p>
              @for (journal of journals; track journal.id) {
                <button type="button" class="module-rail-item c-info" [class.active]="selectedId === journal.id" [attr.aria-current]="selectedId === journal.id ? 'true' : null" (click)="selectedId = journal.id">
                  <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h5"/></svg></span>
                  <span class="module-rail-text">
                    <span class="module-rail-label">{{ sessionTitle(journal.session_id) }}</span>
                    <small class="module-rail-sublabel">{{ journal.updated_at | date:'dd/MM' }} · Fatigue {{ journal.fatigue }}/10</small>
                  </span>
                  @if (journal.coach_comment) { <span class="module-rail-dot" aria-label="Commentaire du coach"></span> }
                </button>
              }
            }
          </nav>

          <div class="module-detail">
            @if (selectedJournal; as journal) {
              <div class="module-detail-card c-info">
                <div class="module-detail-header">
                  <span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h5"/></svg></span>
                  <div>
                    <p class="eyebrow">BILAN DE SÉANCE · {{ journal.updated_at | date:'dd/MM/yyyy HH:mm' }}</p>
                    <h2>{{ sessionTitle(journal.session_id) }}</h2>
                  </div>
                  <span class="module-badge">Humeur {{ moodLabel(journal.mood).toLowerCase() }}</span>
                </div>

                <div class="goal-meter">
                  <div class="goal-meter-head">
                    <strong class="goal-meter-value">{{ journal.fatigue }}/10</strong>
                    <span class="text-secondary">Fatigue ressentie</span>
                  </div>
                  <div class="goal-progress"><span [style.width.%]="journal.fatigue * 10"></span></div>
                </div>

                <p class="module-note">{{ journal.notes || 'Aucun commentaire pour cette séance.' }}</p>
                @if (journal.pain) { <p class="module-note pain-note"><strong>Gêne :</strong> {{ journal.pain }}</p> }
                @if (journal.coach_comment) { <p class="module-note coach-note"><strong>Commentaire du coach :</strong> {{ journal.coach_comment }}</p> }
              </div>
            } @else {
              <div class="module-detail-card c-primary">
                <div class="module-detail-header">
                  <span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></span>
                  <div>
                    <p class="eyebrow">BILAN DE SÉANCE</p>
                    <h2>Ajouter une entrée</h2>
                  </div>
                </div>
                <p class="text-secondary">Choisissez la séance, puis notez votre fatigue, votre humeur et vos sensations.</p>
                <form class="module-form" [formGroup]="form" (ngSubmit)="create()">
                  <mat-form-field appearance="outline"><mat-label>Séance</mat-label><mat-select formControlName="session_id"><mat-option [value]="0">Choisir une séance</mat-option>@for (session of sessions; track session.id) { <mat-option [value]="session.id">{{ session.title }} · {{ session.starts_at | date:'dd/MM/yyyy' }}</mat-option> }</mat-select></mat-form-field>
                  <div class="form-grid">
                    <mat-form-field appearance="outline"><mat-label>Fatigue (1 à 10)</mat-label><input matInput type="number" min="1" max="10" formControlName="fatigue"><mat-hint>1 = très frais, 10 = épuisé</mat-hint></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Humeur</mat-label><mat-select formControlName="mood"><mat-option value="excellent">Excellente</mat-option><mat-option value="bien">Bonne</mat-option><mat-option value="moyen">Moyenne</mat-option><mat-option value="difficile">Difficile</mat-option></mat-select></mat-form-field>
                  </div>
                  <mat-form-field appearance="outline"><mat-label>Commentaire de séance</mat-label><textarea matInput rows="3" formControlName="notes" placeholder="Ce qui a bien fonctionné, vos sensations..."></textarea></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Douleur ou gêne éventuelle</mat-label><input matInput formControlName="pain" placeholder="Aucune douleur"></mat-form-field>
                  @if (error) { <p class="error" role="alert">{{ error }}</p> }
                  <button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid">Enregistrer le bilan</button>
                </form>
              </div>
            }
          </div>
        </div>
      }
    </section>
  `
})
export class JournalComponent {
  private readonly service = inject(JournalService);
  private readonly sessionService = inject(SessionService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly cd = inject(ChangeDetectorRef);
  sessions: SportSession[] = [];
  journals: TrainingJournal[] = [];
  /** Bilan affiché dans le détail ; null = formulaire « Nouvelle entrée ». */
  selectedId: number | null = null;
  loading = true;
  loadError = false;
  error = '';
  readonly form = this.fb.nonNullable.group({ session_id: [0, [Validators.required, Validators.min(1)]], fatigue: [5, [Validators.required, Validators.min(1), Validators.max(10)]], mood: ['bien', Validators.required], notes: [''], pain: [''] });

  constructor() {
    // N'empêche pas l'affichage de l'historique si la liste des séances échoue :
    // le formulaire de création aura juste moins de choix.
    this.sessionService.list().pipe(markForCheck(this.cd)).subscribe({ next: (sessions) => { this.sessions = sessions; } });
    this.load();
  }

  get selectedJournal(): TrainingJournal | undefined {
    return this.journals.find((journal) => journal.id === this.selectedId);
  }

  get averageFatigue(): number | null {
    return this.journals.length ? this.journals.reduce((sum, journal) => sum + journal.fatigue, 0) / this.journals.length : null;
  }

  /** Humeur la plus souvent notée (libellé affiché), ou null sans bilan. */
  get frequentMood(): string | null {
    const counts = new Map<string, number>();
    for (const journal of this.journals) counts.set(journal.mood, (counts.get(journal.mood) ?? 0) + 1);
    const [mood] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    return mood ? this.moodLabel(mood) : null;
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.service.list().pipe(markForCheck(this.cd)).subscribe({
      next: (journals) => {
        this.journals = journals;
        // Ouvre le bilan le plus récent s'il y en a, sinon le formulaire.
        this.selectedId = journals[0]?.id ?? null;
        this.loading = false;
      },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  /** Titre de la séance liée à une entrée de journal, ou un repli si elle a été supprimée. */
  sessionTitle(sessionId: number): string {
    return this.sessions.find((session) => session.id === sessionId)?.title ?? `Séance #${sessionId}`;
  }

  /** Envoie le bilan de séance à l'API, l'ajoute en tête de l'historique et l'affiche, sans recharger la page. */
  create(): void {
    if (this.form.invalid) return;
    this.error = '';
    this.service.create(this.form.getRawValue()).pipe(markForCheck(this.cd)).subscribe({
      next: (entry) => {
        this.journals = [entry, ...this.journals];
        this.selectedId = entry.id;
        this.form.reset({ session_id: 0, fatigue: 5, mood: 'bien', notes: '', pain: '' });
        this.toast.success('Bilan enregistré.');
      },
      error: (error) => { this.error = error?.error?.detail || 'Impossible d’enregistrer ce journal.'; }
    });
  }

  /** Libellé d'humeur ; une valeur hors liste (ex. « motivé ») est affichée avec une majuscule. */
  moodLabel(mood: string): string { return MOOD_LABELS[mood] || mood.charAt(0).toUpperCase() + mood.slice(1); }
}
