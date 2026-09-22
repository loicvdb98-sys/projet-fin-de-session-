import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Goal, GoalService, PersonalRecord } from './goal.service';
import { ToastService } from '@shared/services/toast.service';

/**
 * Écran des objectifs et records personnels : formulaires de création et
 * listes avec barres de progression.
 */
@Component({
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="page goals-page">
      <div class="page-heading"><div><p class="eyebrow">PROGRESSION</p><h1>Objectifs et records</h1><p class="text-secondary">Transformez vos ambitions en étapes mesurables.</p></div></div>
      <div class="goals-layout">
        <mat-card><p class="eyebrow">NOUVEL OBJECTIF</p><h2>Définir une cible</h2>
          <form class="goal-form" [formGroup]="goalForm" (ngSubmit)="addGoal()">
            <mat-form-field appearance="outline"><mat-label>Objectif</mat-label><input matInput formControlName="title" placeholder="Ex. Courir régulièrement"></mat-form-field>
            <div class="form-grid"><mat-form-field appearance="outline"><mat-label>Cible</mat-label><input matInput type="number" formControlName="target_value"></mat-form-field><mat-form-field appearance="outline"><mat-label>Unité</mat-label><input matInput formControlName="unit" placeholder="séances, kg..."></mat-form-field></div>
            <mat-form-field appearance="outline"><mat-label>Date limite</mat-label><input matInput type="date" formControlName="due_date"></mat-form-field>
            @if (goalError) { <p class="error" role="alert">{{ goalError }}</p> }
            <button mat-flat-button class="primary-action" [disabled]="goalForm.invalid">Ajouter l’objectif</button>
          </form>
        </mat-card>
        <mat-card><p class="eyebrow">NOUVEAU RECORD</p><h2>Enregistrer une performance</h2>
          <form class="goal-form" [formGroup]="recordForm" (ngSubmit)="addRecord()">
            <mat-form-field appearance="outline"><mat-label>Exercice</mat-label><input matInput formControlName="exercise_name" placeholder="Ex. Développé couché"></mat-form-field>
            <div class="form-grid"><mat-form-field appearance="outline"><mat-label>Valeur</mat-label><input matInput type="number" formControlName="value"></mat-form-field><mat-form-field appearance="outline"><mat-label>Unité</mat-label><input matInput formControlName="unit" placeholder="kg, reps..."></mat-form-field></div>
            @if (recordError) { <p class="error" role="alert">{{ recordError }}</p> }
            <button mat-flat-button class="teal-button" [disabled]="recordForm.invalid">Enregistrer le record</button>
          </form>
        </mat-card>
      </div>
      @if (loading) {
        <p class="text-secondary">Chargement des objectifs…</p>
      } @else if (loadError) {
        <mat-card class="empty-state-card"><h2>Impossible de charger vos objectifs</h2><p class="text-secondary">Vérifiez votre connexion puis réessayez.</p><button mat-stroked-button (click)="load()">Réessayer</button></mat-card>
      } @else {
        <mat-card class="goal-list"><div class="card-heading"><div><p class="eyebrow">MES OBJECTIFS</p><h2>Progression</h2></div><strong>{{ goals.length }}</strong></div>
          @if (goals.length) { @for (goal of goals; track goal.id) { <div class="goal-row"><div class="goal-row-heading"><strong>{{ goal.title }}</strong><button mat-button class="danger-action" (click)="removeGoal(goal.id)" aria-label="Supprimer l'objectif">Supprimer</button></div><div class="goal-progress"><span [style.width.%]="progress(goal)"></span></div><small>{{ goal.current_value | number:'1.0-1' }} / {{ goal.target_value | number:'1.0-1' }} {{ goal.unit }}@if (goal.due_date) { · échéance {{ goal.due_date | date:'dd/MM/yyyy' }}}</small></div> } } @else { <p class="empty-state">Aucun objectif. Commencez par définir une cible.</p> }
        </mat-card>
        <mat-card class="goal-list"><div class="card-heading"><div><p class="eyebrow">RECORDS PERSONNELS</p><h2>Mes meilleures performances</h2></div><strong>{{ records.length }}</strong></div>
          @if (records.length) { @for (record of records; track record.id) { <div class="record-row"><span><strong>{{ record.exercise_name }}</strong><small>{{ record.achieved_at | date:'dd/MM/yyyy' }}</small></span><strong class="score-value">{{ record.value | number:'1.0-1' }} {{ record.unit }}</strong></div> } } @else { <p class="empty-state">Aucun record enregistré pour le moment.</p> }
        </mat-card>
      }
    </section>
  `
})
export class GoalsComponent {
  private readonly service = inject(GoalService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  goals: Goal[] = [];
  records: PersonalRecord[] = [];
  loading = true;
  loadError = false;
  goalError = '';
  recordError = '';
  readonly goalForm = this.fb.nonNullable.group({ title: ['', [Validators.required, Validators.minLength(2)]], metric: ['progression'], target_value: [1, [Validators.required, Validators.min(0.01)]], current_value: [0], unit: ['séances', Validators.required], due_date: [''], notes: [''] });
  readonly recordForm = this.fb.nonNullable.group({ exercise_name: ['', Validators.required], value: [1, [Validators.required, Validators.min(0.01)]], unit: ['kg', Validators.required], notes: [''] });

  constructor() { this.load(); }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.service.goals().subscribe({
      next: (goals) => {
        this.goals = goals;
        this.service.records().subscribe({
          next: (records) => { this.records = records; this.loading = false; },
          error: () => { this.loadError = true; this.loading = false; }
        });
      },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  /** Crée l'objectif et l'ajoute directement à la liste, sans recharger la page. */
  addGoal(): void {
    if (this.goalForm.invalid) return;
    this.goalError = '';
    this.service.createGoal(this.goalForm.getRawValue()).subscribe({
      next: (goal) => {
        this.goals = [goal, ...this.goals];
        this.goalForm.reset({ title: '', metric: 'progression', target_value: 1, current_value: 0, unit: 'séances', due_date: '', notes: '' });
        this.toast.success('Objectif créé.');
      },
      error: () => { this.goalError = 'Impossible de créer cet objectif.'; }
    });
  }

  /** Enregistre un nouveau record personnel et l'ajoute directement à la liste. */
  addRecord(): void {
    if (this.recordForm.invalid) return;
    this.recordError = '';
    this.service.createRecord(this.recordForm.getRawValue()).subscribe({
      next: (record) => {
        this.records = [record, ...this.records];
        this.recordForm.reset({ exercise_name: '', value: 1, unit: 'kg', notes: '' });
        this.toast.success('Record ajouté.');
      },
      error: () => { this.recordError = 'Impossible d’ajouter ce record.'; }
    });
  }

  /** Supprime un objectif et le retire directement de la liste. */
  removeGoal(id: number): void {
    this.service.deleteGoal(id).subscribe({
      next: () => { this.goals = this.goals.filter((goal) => goal.id !== id); this.toast.success('Objectif supprimé.'); },
      error: () => this.toast.error('Impossible de supprimer cet objectif.')
    });
  }

  progress(goal: Goal): number { return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)); }
}
