import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { JournalService, TrainingJournal } from './journal.service';
import { SessionService, SportSession } from '@features/sessions/session.service';
import { ToastService } from '@shared/services/toast.service';

/**
 * Écran du journal d'entraînement : formulaire de bilan post-séance
 * (fatigue, humeur, douleur, notes) et historique des entrées.
 */
@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <section class="page">
      <div class="page-heading"><div><p class="eyebrow">RÉCUPÉRATION</p><h1>Journal d’entraînement</h1><p class="text-secondary">Notez votre ressenti après chaque séance pour mieux comprendre votre progression.</p></div></div>
      <mat-card class="journal-create-card">
        <p class="eyebrow">BILAN DE SÉANCE</p><h2>Ajouter une entrée</h2>
        <form class="journal-form" [formGroup]="form" (ngSubmit)="create()">
          <mat-form-field appearance="outline"><mat-label>Séance</mat-label><mat-select formControlName="session_id"><mat-option [value]="0">Choisir une séance</mat-option>@for (session of sessions; track session.id) { <mat-option [value]="session.id">{{ session.title }} · {{ session.starts_at | date:'dd/MM/yyyy' }}</mat-option> }</mat-select></mat-form-field>
          <div class="journal-grid">
            <mat-form-field appearance="outline"><mat-label>Fatigue (1 à 10)</mat-label><input matInput type="number" min="1" max="10" formControlName="fatigue"><mat-hint>1 = très frais, 10 = épuisé</mat-hint></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Humeur</mat-label><mat-select formControlName="mood"><mat-option value="excellent">Excellente</mat-option><mat-option value="bien">Bonne</mat-option><mat-option value="moyen">Moyenne</mat-option><mat-option value="difficile">Difficile</mat-option></mat-select></mat-form-field>
          </div>
          <mat-form-field appearance="outline"><mat-label>Commentaire de séance</mat-label><textarea matInput rows="3" formControlName="notes" placeholder="Ce qui a bien fonctionné, vos sensations..."></textarea></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Douleur ou gêne éventuelle</mat-label><input matInput formControlName="pain" placeholder="Aucune douleur"></mat-form-field>
          @if (error) { <p class="error" role="alert">{{ error }}</p> }
          <button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid">Enregistrer le bilan</button>
        </form>
      </mat-card>
      @if (loading) {
        <p class="text-secondary">Chargement du journal…</p>
      } @else if (loadError) {
        <mat-card class="empty-state-card"><h2>Impossible de charger votre journal</h2><p class="text-secondary">Vérifiez votre connexion puis réessayez.</p><button mat-stroked-button (click)="load()">Réessayer</button></mat-card>
      } @else {
        <mat-card class="journal-list"><div class="card-heading"><div><p class="eyebrow">HISTORIQUE</p><h2>Mes ressentis</h2></div><strong>{{ journals.length }}</strong></div>
          @for (journal of journals; track journal.id) {
            <article class="journal-entry"><div class="journal-entry-top"><span class="status-badge info">{{ sessionTitle(journal.session_id) }}</span><time>{{ journal.updated_at | date:'dd/MM/yyyy HH:mm' }}</time></div><div class="journal-metrics"><span>Fatigue <strong>{{ journal.fatigue }}/10</strong></span><span>Humeur <strong>{{ moodLabel(journal.mood) }}</strong></span></div>@if (journal.notes) { <p>{{ journal.notes }}</p> } @if (journal.pain) { <p class="pain-note"><strong>Gêne :</strong> {{ journal.pain }}</p> } @if (journal.coach_comment) { <p class="coach-note"><strong>Commentaire du coach :</strong> {{ journal.coach_comment }}</p> }</article>
          } @empty { <p class="empty-state">Votre historique apparaîtra après votre première séance.</p> }
        </mat-card>
      }
    </section>
  `
})
export class JournalComponent {
  private readonly service = inject(JournalService);
  private readonly sessionService = inject(SessionService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  sessions: SportSession[] = [];
  journals: TrainingJournal[] = [];
  loading = true;
  loadError = false;
  error = '';
  readonly form = this.fb.nonNullable.group({ session_id: [0, [Validators.required, Validators.min(1)]], fatigue: [5, [Validators.required, Validators.min(1), Validators.max(10)]], mood: ['bien', Validators.required], notes: [''], pain: [''] });

  constructor() {
    // N'empêche pas l'affichage de l'historique si la liste des séances échoue :
    // le formulaire de création aura juste moins de choix.
    this.sessionService.list().subscribe({ next: (sessions) => { this.sessions = sessions; } });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.service.list().subscribe({
      next: (journals) => { this.journals = journals; this.loading = false; },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  /** Titre de la séance liée à une entrée de journal, ou un repli si elle a été supprimée. */
  sessionTitle(sessionId: number): string {
    return this.sessions.find((session) => session.id === sessionId)?.title ?? `Séance #${sessionId}`;
  }

  /** Envoie le bilan de séance à l'API et l'ajoute directement à l'historique, sans recharger la page. */
  create(): void {
    if (this.form.invalid) return;
    this.error = '';
    this.service.create(this.form.getRawValue()).subscribe({
      next: (entry) => {
        this.journals = [entry, ...this.journals];
        this.form.reset({ session_id: 0, fatigue: 5, mood: 'bien', notes: '', pain: '' });
        this.toast.success('Bilan enregistré.');
      },
      error: (error) => { this.error = error?.error?.detail || 'Impossible d’enregistrer ce journal.'; }
    });
  }
  moodLabel(mood: string): string { return ({ excellent: 'Excellente', bien: 'Bonne', moyen: 'Moyenne', difficile: 'Difficile' } as Record<string, string>)[mood] || mood; }
}
