import { Component, OnDestroy, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SessionService, Exercise } from './session.service';
import { UserService } from '@features/athletes/user.service';
import { ParticipationService } from '@features/participations/participation.service';
import { ToastService } from '@shared/services/toast.service';
import { forkJoin } from 'rxjs';

type ExerciseForm = {
  name: FormControl<string>;
  sets: FormControl<number>;
  repetitions: FormControl<number>;
  rest_seconds: FormControl<number>;
};

@Component({
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="page">
      <div class="page-heading"><div><p class="eyebrow">PLANNING</p><h1>Vos séances</h1><p class="text-secondary">Retrouvez toutes vos séances à venir.</p></div><a mat-flat-button class="primary-action" routerLink="/workouts/new">+ Créer un entraînement</a></div>
      @if (canManage) {
        <mat-card class="workout-builder">
          <div class="builder-heading"><div><p class="eyebrow">ÉDITEUR MUSCULATION</p><h2>Créer une séance</h2><p class="text-secondary">Ajoutez autant d'exercices que nécessaire.</p></div><span class="status-badge info">{{ exercises.length }} exercice(s)</span></div>
          <form [formGroup]="form" (ngSubmit)="create()">
            <div class="workout-session-fields">
              <mat-form-field appearance="outline"><mat-label>Nom de la séance</mat-label><input matInput formControlName="title"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Date et heure</mat-label><input matInput type="datetime-local" formControlName="starts_at"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Durée (min)</mat-label><input matInput type="number" formControlName="duration_minutes"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Places</mat-label><input matInput type="number" formControlName="capacity"></mat-form-field>
            </div>
            <div class="exercise-list" formArrayName="exercises">
              @for (exercise of exercises.controls; track exercise; let index = $index) {
                <div class="exercise-row" [formGroupName]="index">
                  <span class="exercise-number">{{ index + 1 }}</span>
                  <mat-form-field appearance="outline"><mat-label>Exercice</mat-label><input matInput formControlName="name" placeholder="Ex. Squat"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Séries</mat-label><input matInput type="number" formControlName="sets"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Répétitions</mat-label><input matInput type="number" formControlName="repetitions"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Repos (sec)</mat-label><input matInput type="number" formControlName="rest_seconds"></mat-form-field>
                  <button mat-icon-button type="button" class="danger-action" (click)="removeExercise(index)" aria-label="Supprimer cet exercice">×</button>
                </div>
              }
            </div>
            <div class="builder-actions">
              @if (createError) { <p class="error" role="alert">{{ createError }}</p> }
              <button mat-stroked-button type="button" class="teal-outline" (click)="addExercise()">+ Ajouter un exercice</button>
              <button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid || exercises.length === 0">Créer la séance</button>
            </div>
          </form>
        </mat-card>
      }
      @if (timerExercise) {
        <mat-card class="timer-card"><div><p class="eyebrow">CHRONOMÈTRE DE REPOS</p><h2>{{ timerExercise.name }}</h2><p class="text-secondary">Récupérez avant votre prochaine série.</p></div><strong class="timer-value">{{ formattedTimer }}</strong><div class="timer-actions"><button mat-flat-button class="primary-action" (click)="toggleTimer()">{{ timerRunning ? 'Pause' : 'Démarrer' }}</button><button mat-stroked-button (click)="resetTimer()">Réinitialiser</button><button mat-button (click)="timerExercise = undefined">Fermer</button></div></mat-card>
      }
      @if (sessions$ | async; as sessions) {
        @if (sessions.length) {
          <div class="cards">@for (session of sessions; track session.id) {
            <mat-card class="session-card"><div class="session-card-top"><span class="session-icon" aria-hidden="true">⚡</span><span class="status-badge info">À venir</span></div><mat-card-title>{{ session.title }}</mat-card-title><mat-card-content><p class="session-date">{{ session.starts_at | date:'dd/MM/yyyy à HH:mm' }}</p><p class="text-secondary">{{ session.duration_minutes }} min · {{ session.capacity }} places</p></mat-card-content><mat-card-actions><button mat-button class="teal-action" (click)="register(session.id)">S'inscrire</button><button mat-button (click)="loadExercises(session.id)">Exercices</button></mat-card-actions></mat-card>
          }</div>
        } @else { <p>Aucune séance disponible.</p> }
      }
      @if (selectedExercises.length) {
        <mat-card class="exercise-summary"><h2>Exercices de la séance</h2>@for (exercise of selectedExercises; track exercise.id) { <div class="exercise-summary-row"><span><strong>{{ exercise.name }}</strong><small>{{ exercise.sets }} séries × {{ exercise.repetitions || '—' }} reps · {{ exercise.rest_seconds }} sec de repos</small></span><button mat-button class="teal-action" (click)="startTimer(exercise)">Lancer le repos</button></div> }</mat-card>
      }
    </section>
  `
})
export class SessionsComponent implements OnDestroy {
  private readonly service = inject(SessionService);
  private readonly users = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly participation = inject(ParticipationService);
  private readonly toast = inject(ToastService);
  readonly sessions$ = this.service.list();
  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    starts_at: ['', Validators.required],
    duration_minutes: [60, [Validators.required, Validators.min(1)]],
    capacity: [20, [Validators.required, Validators.min(1)]],
    exercises: this.fb.array<FormGroup<ExerciseForm>>([])
  });
  canManage = false;
  createError = '';
  exercises = this.form.controls.exercises;
  selectedExercises: Exercise[] = [];
  timerExercise?: Exercise;
  timerSeconds = 0;
  timerRunning = false;
  private timer?: ReturnType<typeof setInterval>;

  constructor() { this.users.me().subscribe(user => this.canManage = user.role === 'coach' || user.role === 'admin'); }
  addExercise(): void {
    this.exercises.push(new FormGroup<ExerciseForm>({
      name: this.fb.nonNullable.control('', Validators.required),
      sets: this.fb.nonNullable.control(3, [Validators.required, Validators.min(1)]),
      repetitions: this.fb.nonNullable.control(10, Validators.min(1)),
      rest_seconds: this.fb.nonNullable.control(90, [Validators.required, Validators.min(0)])
    }));
  }
  removeExercise(index: number): void { this.exercises.removeAt(index); }
  create(): void {
    if (this.form.invalid || !this.exercises.length) return;
    this.createError = '';
    this.users.me().subscribe(user => this.service.create({
      title: this.form.controls.title.value || '',
      starts_at: this.form.controls.starts_at.value || '',
      duration_minutes: this.form.controls.duration_minutes.value || 60,
      capacity: this.form.controls.capacity.value || 20,
      coach_id: user.id, description: 'Séance de musculation'
    }).subscribe({ next: session => {
      const items = this.exercises.getRawValue();
      forkJoin(items.map(exercise => this.service.addExercise(session.id, { ...exercise, name: exercise.name || '', sets: exercise.sets || 1, repetitions: exercise.repetitions || undefined, rest_seconds: exercise.rest_seconds || 0 }))).subscribe({
        next: () => { this.form.reset({ title: '', starts_at: '', duration_minutes: 60, capacity: 20 }); this.exercises.clear(); location.reload(); },
        error: () => { this.createError = 'La séance a été créée, mais au moins un exercice n’a pas pu être enregistré.'; }
      });
    }, error: () => { this.createError = 'Impossible de créer la séance. Vérifiez vos droits et les informations saisies.'; } }));
  }
  register(session_id: number): void {
    this.users.me().subscribe(user => this.participation.create(user.id, session_id).subscribe({
      next: () => this.toast.success('Inscription confirmée.'),
      error: () => this.toast.error('Impossible de vous inscrire à cette séance.')
    }));
  }
  loadExercises(sessionId: number): void { this.service.exercises(sessionId).subscribe(exercises => this.selectedExercises = exercises); }
  startTimer(exercise: Exercise): void { this.timerExercise = exercise; this.timerSeconds = exercise.rest_seconds; this.timerRunning = false; this.clearTimer(); }
  toggleTimer(): void {
    this.timerRunning = !this.timerRunning;
    if (this.timerRunning) this.timer = setInterval(() => { if (this.timerSeconds > 0) this.timerSeconds--; else { this.timerRunning = false; this.clearTimer(); } }, 1000);
    else this.clearTimer();
  }
  resetTimer(): void { if (this.timerExercise) this.timerSeconds = this.timerExercise.rest_seconds; this.timerRunning = false; this.clearTimer(); }
  get formattedTimer(): string { return `${Math.floor(this.timerSeconds / 60).toString().padStart(2, '0')}:${(this.timerSeconds % 60).toString().padStart(2, '0')}`; }
  private clearTimer(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  ngOnDestroy(): void { this.clearTimer(); }
}
