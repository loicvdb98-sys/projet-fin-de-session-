import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';
import { Goal, GoalService, PersonalRecord } from './goal.service';
import { ParticipationService } from '@features/participations/participation.service';
import { SessionService } from '@features/sessions/session.service';
import { UserService } from '@features/athletes/user.service';
import { ToastService } from '@shared/services/toast.service';
import { markForCheck } from '@core/mark-for-check.operator';

/** Élément affiché dans le détail : un objectif, un record, ou l'un des deux formulaires de création. */
type Selection = { kind: 'goal' | 'record'; id: number } | { kind: 'new-goal' | 'new-record' };

/**
 * Écran des objectifs et records personnels, au même style « module » que les
 * pages Participations et Statistiques : un résumé chiffré, un rail listant les
 * objectifs puis les records (chaque section commençant par son entrée de
 * création), et le détail de l'élément sélectionné.
 */
@Component({
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgTemplateOutlet, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="page module-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">PROGRESSION</p>
          <h1>Objectifs et records</h1>
          <p class="text-secondary">Transformez vos ambitions en étapes mesurables.</p>
        </div>
      </div>

      @if (loading) {
        <p class="text-secondary">Chargement des objectifs…</p>
      } @else if (loadError) {
        <p class="empty-state">Impossible de charger vos objectifs. <button mat-button class="teal-action" (click)="load()">Réessayer</button></p>
      } @else {
        <div class="cards">
          <mat-card class="stat-card accent">
            <mat-card-title>Objectifs en cours</mat-card-title>
            <strong class="stat-value">{{ goals.length - reachedCount }}</strong>
            <p class="text-secondary">sur {{ goals.length }} objectif(s)</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Objectifs atteints</mat-card-title>
            <strong class="stat-value">{{ reachedCount }}</strong>
            <p class="text-secondary">cible(s) atteinte(s)</p>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-title>Records personnels</mat-card-title>
            <strong class="stat-value">{{ records.length }}</strong>
            <p class="text-secondary">meilleure(s) performance(s)</p>
          </mat-card>
        </div>

        <div class="module-shell">
          <nav class="module-rail" aria-label="Objectifs et records">
            <p class="app-rail-section">Objectifs</p>
            <ng-container *ngTemplateOutlet="newItemTpl; context: { kind: 'new-goal', tint: 'c-primary', label: 'Nouvel objectif' }"></ng-container>
            @for (goal of goals; track goal.id) {
              <button
                type="button"
                class="module-rail-item"
                [class]="isReached(goal) ? 'c-success' : 'c-primary'"
                [class.active]="isSelected('goal', goal.id)"
                [attr.aria-current]="isSelected('goal', goal.id) ? 'true' : null"
                (click)="select({ kind: 'goal', id: goal.id })">
                <span class="module-rail-icon" aria-hidden="true"><ng-container *ngTemplateOutlet="goalIcon"></ng-container></span>
                <span class="module-rail-text">
                  <span class="module-rail-label">{{ goal.title }}</span>
                  <small class="module-rail-sublabel">{{ goal.current_value | number:'1.0-1' }} / {{ goal.target_value | number:'1.0-1' }} {{ goal.unit }} · {{ progress(goal) }} %</small>
                </span>
              </button>
            }

            <p class="app-rail-section">Records</p>
            <ng-container *ngTemplateOutlet="newItemTpl; context: { kind: 'new-record', tint: 'c-secondary', label: 'Nouveau record' }"></ng-container>
            @for (record of records; track record.id) {
              <button
                type="button"
                class="module-rail-item c-secondary"
                [class.active]="isSelected('record', record.id)"
                [attr.aria-current]="isSelected('record', record.id) ? 'true' : null"
                (click)="select({ kind: 'record', id: record.id })">
                <span class="module-rail-icon" aria-hidden="true"><ng-container *ngTemplateOutlet="recordIcon"></ng-container></span>
                <span class="module-rail-text">
                  <span class="module-rail-label">{{ record.exercise_name }}</span>
                  <small class="module-rail-sublabel">{{ record.value | number:'1.0-1' }} {{ record.unit }} · {{ record.achieved_at | date:'dd/MM' }}</small>
                </span>
              </button>
            }
          </nav>

          <div class="module-detail">
            @switch (selected.kind) {
              @case ('goal') {
                @if (selectedGoal; as goal) {
                  <div class="module-detail-card" [class]="isReached(goal) ? 'c-success' : 'c-primary'">
                    <div class="module-detail-header">
                      <span class="module-icon" aria-hidden="true"><ng-container *ngTemplateOutlet="goalIcon"></ng-container></span>
                      <div>
                        <p class="eyebrow">OBJECTIF{{ isReached(goal) ? ' · ATTEINT' : ' · EN COURS' }}</p>
                        <h2>{{ goal.title }}</h2>
                      </div>
                      <span class="module-badge">{{ isReached(goal) ? 'Atteint' : 'En cours' }}</span>
                    </div>

                    <p class="text-secondary">{{ goal.due_date ? 'Échéance le ' + (goal.due_date | date:'dd/MM/yyyy') : 'Pas d’échéance définie.' }}</p>

                    <div class="goal-meter">
                      <div class="goal-meter-head">
                        <strong class="goal-meter-value">{{ progress(goal) }} %</strong>
                        <span class="text-secondary">{{ goal.current_value | number:'1.0-1' }} / {{ goal.target_value | number:'1.0-1' }} {{ goal.unit }}</span>
                      </div>
                      <div class="goal-progress"><span [style.width.%]="progress(goal)"></span></div>
                    </div>
                    @if (goal.notes) { <span class="module-stat-line text-secondary">{{ goal.notes }}</span> }

                    <form class="module-form goal-progress-form" [formGroup]="progressForm" (ngSubmit)="saveProgress(goal)">
                      <div class="form-inline">
                        <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Valeur actuelle ({{ goal.unit }})</mat-label><input matInput type="number" min="0" formControlName="current_value"></mat-form-field>
                        <button mat-flat-button class="primary-action" type="submit" [disabled]="progressForm.invalid || progressForm.pristine">Mettre à jour</button>
                      </div>
                      @if (isSessionGoal(goal) && attendedThisMonth !== null) {
                        <p class="text-secondary goal-suggestion">
                          Vous avez suivi {{ attendedThisMonth }} séance(s) depuis le 1er {{ monthStart | date:'MMMM' }}.
                          @if (attendedThisMonth !== goal.current_value) { <button type="button" class="link-button" (click)="useAttendance()">Reprendre ce nombre</button> }
                        </p>
                      }
                    </form>

                    <div class="module-detail-actions">
                      <button type="button" class="action-chip danger" (click)="removeGoal(goal.id)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
                        Supprimer l’objectif
                      </button>
                    </div>
                  </div>
                }
              }
              @case ('record') {
                @if (selectedRecord; as record) {
                  <div class="module-detail-card c-secondary">
                    <div class="module-detail-header">
                      <span class="module-icon" aria-hidden="true"><ng-container *ngTemplateOutlet="recordIcon"></ng-container></span>
                      <div>
                        <p class="eyebrow">RECORD PERSONNEL</p>
                        <h2>{{ record.exercise_name }}</h2>
                      </div>
                      <span class="module-badge">{{ record.unit }}</span>
                    </div>

                    <p class="text-secondary">Établi le {{ record.achieved_at | date:'dd/MM/yyyy' }}.</p>
                    <div class="goal-meter">
                      <strong class="goal-meter-value">{{ record.value | number:'1.0-1' }} {{ record.unit }}</strong>
                    </div>
                    @if (record.notes) { <span class="module-stat-line text-secondary">{{ record.notes }}</span> }

                    <div class="module-detail-actions">
                      <button type="button" class="action-chip danger" (click)="removeRecord(record.id)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
                        Supprimer le record
                      </button>
                    </div>
                  </div>
                }
              }
              @case ('new-goal') {
                <div class="module-detail-card c-primary">
                  <div class="module-detail-header">
                    <span class="module-icon" aria-hidden="true"><ng-container *ngTemplateOutlet="plusIcon"></ng-container></span>
                    <div>
                      <p class="eyebrow">NOUVEL OBJECTIF</p>
                      <h2>Définir une cible</h2>
                    </div>
                  </div>
                  <p class="text-secondary">Fixez une valeur à atteindre et, si vous le souhaitez, une échéance.</p>
                  <form class="module-form" [formGroup]="goalForm" (ngSubmit)="addGoal()">
                    <mat-form-field appearance="outline"><mat-label>Objectif</mat-label><input matInput formControlName="title" placeholder="Ex. Courir régulièrement"></mat-form-field>
                    <div class="form-grid three">
                      <mat-form-field appearance="outline"><mat-label>Cible</mat-label><input matInput type="number" formControlName="target_value"></mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Unité</mat-label><input matInput formControlName="unit" placeholder="séances, kg..."></mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Date limite</mat-label><input matInput type="date" formControlName="due_date"></mat-form-field>
                    </div>
                    @if (goalError) { <p class="error" role="alert">{{ goalError }}</p> }
                    <button mat-flat-button class="primary-action" [disabled]="goalForm.invalid">Ajouter l’objectif</button>
                  </form>
                </div>
              }
              @case ('new-record') {
                <div class="module-detail-card c-secondary">
                  <div class="module-detail-header">
                    <span class="module-icon" aria-hidden="true"><ng-container *ngTemplateOutlet="plusIcon"></ng-container></span>
                    <div>
                      <p class="eyebrow">NOUVEAU RECORD</p>
                      <h2>Enregistrer une performance</h2>
                    </div>
                  </div>
                  <p class="text-secondary">Notez votre meilleure performance sur un exercice.</p>
                  <form class="module-form" [formGroup]="recordForm" (ngSubmit)="addRecord()">
                    <mat-form-field appearance="outline"><mat-label>Exercice</mat-label><input matInput formControlName="exercise_name" placeholder="Ex. Développé couché"></mat-form-field>
                    <div class="form-grid">
                      <mat-form-field appearance="outline"><mat-label>Valeur</mat-label><input matInput type="number" formControlName="value"></mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Unité</mat-label><input matInput formControlName="unit" placeholder="kg, reps..."></mat-form-field>
                    </div>
                    @if (recordError) { <p class="error" role="alert">{{ recordError }}</p> }
                    <button mat-flat-button class="teal-button" [disabled]="recordForm.invalid">Enregistrer le record</button>
                  </form>
                </div>
              }
            }
          </div>
        </div>

        <ng-template #newItemTpl let-kind="kind" let-tint="tint" let-label="label">
          <button
            type="button"
            class="module-rail-item"
            [class]="tint"
            [class.active]="selected.kind === kind"
            [attr.aria-current]="selected.kind === kind ? 'true' : null"
            (click)="select({ kind: kind })">
            <span class="module-rail-icon" aria-hidden="true"><ng-container *ngTemplateOutlet="plusIcon"></ng-container></span>
            <span class="module-rail-label">{{ label }}</span>
          </button>
        </ng-template>
        <ng-template #goalIcon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none"/></svg></ng-template>
        <ng-template #recordIcon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.5 12.9L17 22l-5-3-5 3 1.5-9.1"/></svg></ng-template>
        <ng-template #plusIcon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></ng-template>
      }
    </section>
  `
})
export class GoalsComponent {
  private readonly service = inject(GoalService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly cd = inject(ChangeDetectorRef);
  goals: Goal[] = [];
  records: PersonalRecord[] = [];
  selected: Selection = { kind: 'new-goal' };
  loading = true;
  loadError = false;
  goalError = '';
  recordError = '';
  readonly goalForm = this.fb.nonNullable.group({ title: ['', [Validators.required, Validators.minLength(2)]], metric: ['progression'], target_value: [1, [Validators.required, Validators.min(0.01)]], current_value: [0], unit: ['séances', Validators.required], due_date: [''], notes: [''] });
  readonly progressForm = this.fb.nonNullable.group({ current_value: [0, [Validators.required, Validators.min(0)]] });
  /** Séances suivies (présent) par l'utilisateur depuis le 1er du mois, ou null si inconnu. */
  attendedThisMonth: number | null = null;
  readonly monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  private readonly participations = inject(ParticipationService);
  private readonly sessionService = inject(SessionService);
  private readonly users = inject(UserService);
  readonly recordForm = this.fb.nonNullable.group({ exercise_name: ['', Validators.required], value: [1, [Validators.required, Validators.min(0.01)]], unit: ['kg', Validators.required], notes: [''] });

  constructor() { this.load(); this.loadAttendance(); }

  get reachedCount(): number { return this.goals.filter((goal) => this.isReached(goal)).length; }

  get selectedGoal(): Goal | undefined {
    const selected = this.selected;
    return selected.kind === 'goal' ? this.goals.find((goal) => goal.id === selected.id) : undefined;
  }

  get selectedRecord(): PersonalRecord | undefined {
    const selected = this.selected;
    return selected.kind === 'record' ? this.records.find((record) => record.id === selected.id) : undefined;
  }

  select(selection: Selection): void {
    this.selected = selection;
    this.resetProgressForm();
  }

  isSelected(kind: 'goal' | 'record', id: number): boolean {
    return this.selected.kind === kind && 'id' in this.selected && this.selected.id === id;
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.service.goals().pipe(markForCheck(this.cd)).subscribe({
      next: (goals) => {
        this.goals = goals;
        this.service.records().pipe(markForCheck(this.cd)).subscribe({
          next: (records) => {
            this.records = records;
            // Ouvre le premier objectif s'il y en a, sinon le formulaire de création.
            this.select(goals.length ? { kind: 'goal', id: goals[0].id } : { kind: 'new-goal' });
            this.loading = false;
          },
          error: () => { this.loadError = true; this.loading = false; }
        });
      },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  /** Crée l'objectif, l'ajoute en tête de liste et l'affiche, sans recharger la page. */
  addGoal(): void {
    if (this.goalForm.invalid) return;
    this.goalError = '';
    this.service.createGoal(this.goalForm.getRawValue()).pipe(markForCheck(this.cd)).subscribe({
      next: (goal) => {
        this.goals = [goal, ...this.goals];
        this.select({ kind: 'goal', id: goal.id });
        this.goalForm.reset({ title: '', metric: 'progression', target_value: 1, current_value: 0, unit: 'séances', due_date: '', notes: '' });
        this.toast.success('Objectif créé.');
      },
      error: () => { this.goalError = 'Impossible de créer cet objectif.'; }
    });
  }

  /** Enregistre un nouveau record personnel, l'ajoute en tête de liste et l'affiche. */
  addRecord(): void {
    if (this.recordForm.invalid) return;
    this.recordError = '';
    this.service.createRecord(this.recordForm.getRawValue()).pipe(markForCheck(this.cd)).subscribe({
      next: (record) => {
        this.records = [record, ...this.records];
        this.selected = { kind: 'record', id: record.id };
        this.recordForm.reset({ exercise_name: '', value: 1, unit: 'kg', notes: '' });
        this.toast.success('Record ajouté.');
      },
      error: () => { this.recordError = 'Impossible d’ajouter ce record.'; }
    });
  }

  /** Supprime un objectif, le retire de la liste et affiche l'objectif suivant (ou le formulaire). */
  removeGoal(id: number): void {
    this.service.deleteGoal(id).pipe(markForCheck(this.cd)).subscribe({
      next: () => {
        this.goals = this.goals.filter((goal) => goal.id !== id);
        this.select(this.goals.length ? { kind: 'goal', id: this.goals[0].id } : { kind: 'new-goal' });
        this.toast.success('Objectif supprimé.');
      },
      error: () => this.toast.error('Impossible de supprimer cet objectif.')
    });
  }

  /** Supprime un record, le retire de la liste et affiche le suivant (ou le formulaire). */
  removeRecord(id: number): void {
    this.service.deleteRecord(id).pipe(markForCheck(this.cd)).subscribe({
      next: () => {
        this.records = this.records.filter((record) => record.id !== id);
        this.selected = this.records.length ? { kind: 'record', id: this.records[0].id } : { kind: 'new-record' };
        this.toast.success('Record supprimé.');
      },
      error: () => this.toast.error('Impossible de supprimer ce record.')
    });
  }

  /** Enregistre la nouvelle valeur actuelle de l'objectif et met la fiche à jour en place. */
  saveProgress(goal: Goal): void {
    if (this.progressForm.invalid) return;
    const { id, user_id, ...data } = goal;
    this.service.updateGoal(id, { ...data, current_value: this.progressForm.getRawValue().current_value }).pipe(markForCheck(this.cd)).subscribe({
      next: (updated) => {
        this.goals = this.goals.map((item) => (item.id === updated.id ? updated : item));
        this.resetProgressForm();
        this.toast.success(this.isReached(updated) ? 'Objectif atteint, bravo !' : 'Progression mise à jour.');
      },
      error: () => this.toast.error('Impossible de mettre à jour cet objectif.')
    });
  }

  /** Reprend dans le champ le nombre de séances suivies ce mois-ci. */
  useAttendance(): void {
    if (this.attendedThisMonth === null) return;
    this.progressForm.setValue({ current_value: this.attendedThisMonth });
    this.progressForm.markAsDirty();
  }

  /** Objectif compté en séances (unité « séance(s) »), pour lequel on peut proposer la présence réelle. */
  isSessionGoal(goal: Goal): boolean { return goal.unit.trim().toLowerCase().startsWith('séance'); }

  progress(goal: Goal): number { return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)); }

  isReached(goal: Goal): boolean { return goal.current_value >= goal.target_value; }

  private resetProgressForm(): void {
    this.progressForm.reset({ current_value: this.selectedGoal?.current_value ?? 0 });
  }

  /** Compte les séances où l'utilisateur a été marqué présent depuis le 1er du mois (séances déjà passées). */
  private loadAttendance(): void {
    forkJoin([this.users.me(), this.participations.list(), this.sessionService.list()]).pipe(markForCheck(this.cd)).subscribe({
      next: ([me, participations, sessions]) => {
        const startsAt = new Map(sessions.map((session) => [session.id, new Date(session.starts_at).getTime()]));
        const now = Date.now();
        this.attendedThisMonth = participations.filter((participation) => {
          const time = startsAt.get(participation.session_id);
          return participation.user_id === me.id && participation.status === 'present' && time !== undefined && time >= this.monthStart.getTime() && time <= now;
        }).length;
      },
      error: () => { this.attendedThisMonth = null; }
    });
  }
}
