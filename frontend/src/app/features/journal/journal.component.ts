import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { of, switchMap } from 'rxjs';
import { JournalService, TrainingJournal } from './journal.service';
import { SessionService, SportSession } from '@features/sessions/session.service';
import { UserService } from '@features/athletes/user.service';
import { ToastService } from '@shared/services/toast.service';
import { markForCheck } from '@core/mark-for-check.operator';

const MOOD_LABELS: Record<string, string> = { excellent: 'Excellente', bien: 'Bonne', moyen: 'Moyenne', difficile: 'Difficile' };

/**
 * Écran du journal d'entraînement, au même style « module » que les pages
 * Participations et Objectifs : un résumé chiffré, un rail (nouvelle entrée
 * puis historique des bilans) et le détail du bilan sélectionné, ou le
 * formulaire de bilan post-séance (fatigue, humeur, douleur, notes).
 *
 * L'auteur d'un bilan peut le modifier ou le supprimer ; le coach (ou l'admin)
 * voit les bilans de ses séances, avec le nom du sportif, et y ajoute son
 * commentaire - les mêmes règles sont appliquées côté API.
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
          <p class="text-secondary">{{ isManager ? 'Retrouvez les bilans de vos sportifs après vos séances et commentez-les.' : 'Notez votre ressenti après chaque séance pour mieux comprendre votre progression.' }}</p>
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
            <button type="button" class="module-rail-item c-primary" [class.active]="selectedId === null" [attr.aria-current]="selectedId === null ? 'true' : null" (click)="select(null)">
              <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></span>
              <span class="module-rail-label">Nouvelle entrée</span>
            </button>
            @if (journals.length) {
              <p class="app-rail-section">Historique</p>
              @for (journal of journals; track journal.id) {
                <button type="button" class="module-rail-item c-info" [class.active]="selectedId === journal.id" [attr.aria-current]="selectedId === journal.id ? 'true' : null" (click)="select(journal.id)">
                  <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h5"/></svg></span>
                  <span class="module-rail-text">
                    <span class="module-rail-label">{{ sessionTitle(journal.session_id) }}</span>
                    <small class="module-rail-sublabel">{{ authorPrefix(journal) }}{{ journal.updated_at | date:'dd/MM' }} · Fatigue {{ journal.fatigue }}/10</small>
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
                @if (!isOwn(journal)) { <span class="module-stat-line text-secondary">Sportif : {{ authorName(journal) }}</span> }

                @if (editing) {
                  <form class="module-form" [formGroup]="editForm" (ngSubmit)="saveEdit(journal)">
                    <div class="form-grid">
                      <mat-form-field appearance="outline"><mat-label>Fatigue (1 à 10)</mat-label><input matInput type="number" min="1" max="10" formControlName="fatigue"></mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Humeur</mat-label><mat-select formControlName="mood">@for (option of moodOptions(journal.mood); track option.value) { <mat-option [value]="option.value">{{ option.label }}</mat-option> }</mat-select></mat-form-field>
                    </div>
                    <mat-form-field appearance="outline"><mat-label>Commentaire de séance</mat-label><textarea matInput rows="3" formControlName="notes"></textarea></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Douleur ou gêne éventuelle</mat-label><input matInput formControlName="pain"></mat-form-field>
                    <div class="form-actions">
                      <button mat-flat-button class="primary-action" type="submit" [disabled]="editForm.invalid">Enregistrer</button>
                      <button mat-stroked-button type="button" (click)="editing = false">Annuler</button>
                    </div>
                  </form>
                } @else {
                  <div class="goal-meter">
                    <div class="goal-meter-head">
                      <strong class="goal-meter-value">{{ journal.fatigue }}/10</strong>
                      <span class="text-secondary">Fatigue ressentie</span>
                    </div>
                    <div class="goal-progress"><span [style.width.%]="journal.fatigue * 10"></span></div>
                  </div>

                  <p class="module-note">{{ journal.notes || 'Aucun commentaire pour cette séance.' }}</p>
                  @if (journal.pain) { <p class="module-note pain-note"><strong>Gêne :</strong> {{ journal.pain }}</p> }

                  @if (canComment(journal)) {
                    <form class="module-form" [formGroup]="commentForm" (ngSubmit)="saveComment(journal)">
                      <mat-form-field appearance="outline"><mat-label>Commentaire du coach</mat-label><textarea matInput rows="2" formControlName="coach_comment" placeholder="Un retour pour votre sportif…"></textarea></mat-form-field>
                      <button mat-flat-button class="primary-action" type="submit" [disabled]="commentForm.pristine">Enregistrer le commentaire</button>
                    </form>
                  } @else if (journal.coach_comment) {
                    <p class="module-note coach-note"><strong>Commentaire du coach :</strong> {{ journal.coach_comment }}</p>
                  }

                  @if (isOwn(journal) || isAdmin) {
                    <div class="module-detail-actions">
                      @if (isOwn(journal)) {
                        <button type="button" class="action-chip" (click)="startEdit(journal)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          Modifier
                        </button>
                      }
                      <button type="button" class="action-chip danger" (click)="remove(journal.id)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
                        Supprimer le bilan
                      </button>
                    </div>
                  }
                }
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
  private readonly users = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly cd = inject(ChangeDetectorRef);
  sessions: SportSession[] = [];
  journals: TrainingJournal[] = [];
  /** Bilan affiché dans le détail ; null = formulaire « Nouvelle entrée ». */
  selectedId: number | null = null;
  currentUserId?: number;
  isManager = false;
  isAdmin = false;
  /** Noms des sportifs (chargés pour un coach ou un admin, qui voit les bilans des autres). */
  private athleteNames = new Map<number, string>();
  editing = false;
  loading = true;
  loadError = false;
  error = '';
  readonly form = this.fb.nonNullable.group({ session_id: [0, [Validators.required, Validators.min(1)]], fatigue: [5, [Validators.required, Validators.min(1), Validators.max(10)]], mood: ['bien', Validators.required], notes: [''], pain: [''] });
  readonly editForm = this.fb.nonNullable.group({ fatigue: [5, [Validators.required, Validators.min(1), Validators.max(10)]], mood: ['bien', Validators.required], notes: [''], pain: [''] });
  readonly commentForm = this.fb.nonNullable.group({ coach_comment: [''] });

  constructor() {
    // N'empêche pas l'affichage de l'historique si la liste des séances échoue :
    // le formulaire de création aura juste moins de choix.
    this.sessionService.list().pipe(markForCheck(this.cd)).subscribe({ next: (sessions) => { this.sessions = sessions; } });
    this.users.me().pipe(
      switchMap((me) => {
        this.currentUserId = me.id;
        this.isManager = me.role === 'coach' || me.role === 'admin';
        this.isAdmin = me.role === 'admin';
        return this.isManager ? this.users.list() : of([]);
      }),
      markForCheck(this.cd)
    ).subscribe({ next: (users) => { this.athleteNames = new Map(users.map((user) => [user.id, user.full_name])); this.resetCommentForm(); } });
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
        this.select(journals[0]?.id ?? null);
        this.loading = false;
      },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  /** Affiche un bilan (ou le formulaire si null) et remet à zéro les formulaires de la fiche. */
  select(id: number | null): void {
    this.selectedId = id;
    this.editing = false;
    this.resetCommentForm();
  }

  isOwn(journal: TrainingJournal): boolean { return journal.user_id === this.currentUserId; }

  /** Le coach de la séance (ou un admin) commente les bilans de ses sportifs, pas les siens. */
  canComment(journal: TrainingJournal): boolean { return this.isManager && !this.isOwn(journal); }

  authorName(journal: TrainingJournal): string { return this.athleteNames.get(journal.user_id) ?? 'Sportif'; }

  /** Préfixe « Nom · » du sous-titre dans le rail, pour un coach ou un admin. */
  authorPrefix(journal: TrainingJournal): string { return this.isManager && !this.isOwn(journal) ? `${this.authorName(journal)} · ` : ''; }

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
        this.select(entry.id);
        this.form.reset({ session_id: 0, fatigue: 5, mood: 'bien', notes: '', pain: '' });
        this.toast.success('Bilan enregistré.');
      },
      error: (error) => { this.error = error?.error?.detail || 'Impossible d’enregistrer ce journal.'; }
    });
  }

  startEdit(journal: TrainingJournal): void {
    this.editForm.reset({ fatigue: journal.fatigue, mood: journal.mood, notes: journal.notes ?? '', pain: journal.pain ?? '' });
    this.editing = true;
  }

  saveEdit(journal: TrainingJournal): void {
    if (this.editForm.invalid) return;
    this.service.update(journal.id, this.editForm.getRawValue()).pipe(markForCheck(this.cd)).subscribe({
      next: (updated) => { this.replace(updated); this.editing = false; this.toast.success('Bilan modifié.'); },
      error: () => this.toast.error('Impossible de modifier ce bilan.')
    });
  }

  saveComment(journal: TrainingJournal): void {
    this.service.update(journal.id, { coach_comment: this.commentForm.getRawValue().coach_comment.trim() }).pipe(markForCheck(this.cd)).subscribe({
      next: (updated) => { this.replace(updated); this.resetCommentForm(); this.toast.success('Commentaire enregistré.'); },
      error: () => this.toast.error('Impossible d’enregistrer ce commentaire.')
    });
  }

  /** Supprime un bilan, le retire de l'historique et affiche le suivant (ou le formulaire). */
  remove(id: number): void {
    this.service.delete(id).pipe(markForCheck(this.cd)).subscribe({
      next: () => {
        this.journals = this.journals.filter((journal) => journal.id !== id);
        this.select(this.journals[0]?.id ?? null);
        this.toast.success('Bilan supprimé.');
      },
      error: () => this.toast.error('Impossible de supprimer ce bilan.')
    });
  }

  /** Humeurs proposées à la modification : la liste standard, plus la valeur actuelle si elle n'en fait pas partie. */
  moodOptions(current: string): { value: string; label: string }[] {
    const options = Object.entries(MOOD_LABELS).map(([value, label]) => ({ value, label }));
    return MOOD_LABELS[current] ? options : [{ value: current, label: this.moodLabel(current) }, ...options];
  }

  /** Libellé d'humeur ; une valeur hors liste (ex. « motivé ») est affichée avec une majuscule. */
  moodLabel(mood: string): string { return MOOD_LABELS[mood] || mood.charAt(0).toUpperCase() + mood.slice(1); }

  private replace(updated: TrainingJournal): void {
    this.journals = this.journals.map((journal) => (journal.id === updated.id ? updated : journal));
  }

  private resetCommentForm(): void {
    this.commentForm.reset({ coach_comment: this.selectedJournal?.coach_comment ?? '' });
  }
}
