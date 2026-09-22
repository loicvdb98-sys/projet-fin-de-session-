import { ApplicationRef, Component, NgZone, OnDestroy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SessionService, SportSession, Exercise } from './session.service';
import { UserService } from '@features/athletes/user.service';
import { ParticipationService } from '@features/participations/participation.service';
import { ToastService } from '@shared/services/toast.service';
import { forkJoin } from 'rxjs';

/**
 * Écran des séances : liste des séances disponibles, inscription, consultation
 * des exercices avec chronomètre de repos, et (pour les coachs) un éditeur pour
 * créer une nouvelle séance, plus la modification, l'annulation et le suivi de
 * présence des séances que l'utilisateur gère (les siennes pour un coach,
 * n'importe laquelle pour un admin).
 */
type ExerciseForm = {
  name: FormControl<string>;
  sets: FormControl<number>;
  repetitions: FormControl<number>;
  rest_seconds: FormControl<number>;
};

interface AttendanceRow {
  participationId: number;
  userId: number;
  fullName: string;
  status: string;
}

const ATTENDANCE_STATUSES: { value: string; label: string }[] = [
  { value: 'inscrit', label: 'Inscrit' },
  { value: 'present', label: 'Présent' },
  { value: 'absent', label: 'Absent' },
];

@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule],
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
      @if (sessionsLoading) {
        <p class="text-secondary">Chargement des séances…</p>
      } @else if (sessionsLoadError) {
        <p class="empty-state">Impossible de charger les séances. <button mat-button class="teal-action" (click)="refreshSessions()">Réessayer</button></p>
      } @else if (sessions.length) {
        <div class="cards">
          @for (session of sessions; track session.id) {
            <mat-card class="session-card">
              <div class="session-card-top">
                <span class="session-icon" aria-hidden="true">⚡</span>
                <span class="status-badge" [class]="remainingSpots(session) > 0 ? 'info' : 'danger'">{{ remainingSpots(session) > 0 ? remainingSpots(session) + ' place(s)' : 'Complet' }}</span>
              </div>

              @if (editingSessionId === session.id) {
                <form class="session-edit-form" [formGroup]="editForm" (ngSubmit)="saveEdit(session)">
                  <mat-form-field appearance="outline"><mat-label>Nom</mat-label><input matInput formControlName="title"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Date et heure</mat-label><input matInput type="datetime-local" formControlName="starts_at"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Durée (min)</mat-label><input matInput type="number" formControlName="duration_minutes"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Places</mat-label><input matInput type="number" formControlName="capacity"></mat-form-field>
                  @if (editError) { <p class="error" role="alert">{{ editError }}</p> }
                  <div class="builder-actions">
                    <button mat-button type="button" (click)="cancelEdit()">Annuler</button>
                    <button mat-flat-button class="primary-action" type="submit" [disabled]="editForm.invalid">Enregistrer</button>
                  </div>
                </form>
              } @else {
                <mat-card-title>{{ session.title }}</mat-card-title>
                <mat-card-content>
                  <p class="session-date">{{ session.starts_at | date:'dd/MM/yyyy à HH:mm' }}</p>
                  <p class="text-secondary">{{ session.duration_minutes }} min · {{ session.registered_count }}/{{ session.capacity }} inscrits</p>
                  <p class="session-coach">Coach : {{ session.coach_name }}{{ session.coach_id === currentUserId ? ' (vous)' : '' }}</p>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-button class="teal-action" [disabled]="remainingSpots(session) <= 0" (click)="register(session.id)">S'inscrire</button>
                  <button mat-button (click)="loadExercises(session.id)">Exercices</button>
                  @if (canManageSession(session)) {
                    <button mat-button (click)="toggleAttendance(session)">Présences</button>
                    <button mat-button (click)="startEdit(session)">Modifier</button>
                    <button mat-button class="danger-action" (click)="cancelSession(session)">Annuler</button>
                  }
                </mat-card-actions>

                @if (attendanceSessionId === session.id) {
                  <div class="attendance-panel">
                    @if (attendanceLoading) {
                      <p class="text-secondary">Chargement des inscrits…</p>
                    } @else if (attendanceRows.length) {
                      @for (row of attendanceRows; track row.participationId) {
                        <div class="attendance-row">
                          <span>{{ row.fullName }}</span>
                          <div class="attendance-actions">
                            @for (option of attendanceStatuses; track option.value) {
                              <button
                                type="button"
                                class="attendance-chip"
                                [class.active]="row.status === option.value"
                                (click)="setAttendance(row, option.value)"
                              >{{ option.label }}</button>
                            }
                          </div>
                        </div>
                      }
                    } @else {
                      <p class="empty-state">Aucun inscrit pour cette séance.</p>
                    }
                  </div>
                }
              }
            </mat-card>
          }
        </div>
      } @else { <p>Aucune séance disponible.</p> }
      @if (selectedExercises.length) {
        <mat-card class="exercise-summary"><h2>Exercices de la séance</h2>@for (exercise of selectedExercises; track exercise.id) { <div class="exercise-summary-row"><span><strong>{{ exercise.name }}</strong><small>{{ exercise.sets }} séries × {{ exercise.repetitions || '—' }} reps · {{ exercise.rest_seconds }} sec de repos</small></span><button mat-button class="teal-action" (click)="startTimer(exercise)">Lancer le repos</button></div> }</mat-card>
      }
    </section>
  `
})
/** Pilote la liste des séances, la création/édition/annulation (coach), le suivi de présence et le chronomètre de repos. */
export class SessionsComponent implements OnDestroy {
  private readonly service = inject(SessionService);
  private readonly users = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly participation = inject(ParticipationService);
  private readonly toast = inject(ToastService);
  private readonly zone = inject(NgZone);
  private readonly appRef = inject(ApplicationRef);

  sessions: SportSession[] = [];
  sessionsLoading = true;
  sessionsLoadError = false;
  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    starts_at: ['', Validators.required],
    duration_minutes: [60, [Validators.required, Validators.min(1)]],
    capacity: [20, [Validators.required, Validators.min(1)]],
    exercises: this.fb.array<FormGroup<ExerciseForm>>([])
  });
  readonly editForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    starts_at: ['', Validators.required],
    duration_minutes: [60, [Validators.required, Validators.min(1)]],
    capacity: [20, [Validators.required, Validators.min(1)]],
  });
  canManage = false;
  isAdmin = false;
  currentUserId?: number;
  createError = '';
  editError = '';
  editingSessionId?: number;
  exercises = this.form.controls.exercises;
  selectedExercises: Exercise[] = [];
  timerExercise?: Exercise;
  timerSeconds = 0;
  timerRunning = false;
  private timer?: ReturnType<typeof setInterval>;

  readonly attendanceStatuses = ATTENDANCE_STATUSES;
  attendanceSessionId?: number;
  attendanceRows: AttendanceRow[] = [];
  attendanceLoading = false;

  // Le rôle n'est pas dans le token JWT décodable côté client : on le récupère via le profil
  // pour savoir si l'éditeur de création de séance et les actions de gestion doivent s'afficher.
  constructor() {
    this.users.me().subscribe(user => {
      this.canManage = user.role === 'coach' || user.role === 'admin';
      this.isAdmin = user.role === 'admin';
      this.currentUserId = user.id;
    });
    this.refreshSessions();
  }

  refreshSessions(): void {
    this.sessionsLoading = true;
    this.sessionsLoadError = false;
    this.service.list().subscribe({
      next: (list) => { this.sessions = list; this.sessionsLoading = false; },
      error: () => { this.sessionsLoadError = true; this.sessionsLoading = false; }
    });
  }

  /** Places encore disponibles pour une séance (jamais négatif). */
  remainingSpots(session: SportSession): number {
    return Math.max(0, session.capacity - session.registered_count);
  }

  /** Un admin gère toutes les séances ; un coach ne gère que les siennes. */
  canManageSession(session: SportSession): boolean {
    return this.isAdmin || session.coach_id === this.currentUserId;
  }

  /** Ajoute une ligne d'exercice vierge (valeurs par défaut) au formulaire de création. */
  addExercise(): void {
    this.exercises.push(new FormGroup<ExerciseForm>({
      name: this.fb.nonNullable.control('', Validators.required),
      sets: this.fb.nonNullable.control(3, [Validators.required, Validators.min(1)]),
      repetitions: this.fb.nonNullable.control(10, Validators.min(1)),
      rest_seconds: this.fb.nonNullable.control(90, [Validators.required, Validators.min(0)])
    }));
  }
  removeExercise(index: number): void { this.exercises.removeAt(index); }

  /**
   * Crée la séance puis enregistre tous ses exercices en parallèle (forkJoin).
   * Si la séance est créée mais qu'un exercice échoue, un message dédié est affiché
   * plutôt que l'erreur générique de création de séance.
   */
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
        next: () => { this.form.reset({ title: '', starts_at: '', duration_minutes: 60, capacity: 20 }); this.exercises.clear(); this.refreshSessions(); },
        error: () => { this.createError = 'La séance a été créée, mais au moins un exercice n’a pas pu être enregistré.'; }
      });
    }, error: () => { this.createError = 'Impossible de créer la séance. Vérifiez vos droits et les informations saisies.'; } }));
  }

  /** Inscrit l'utilisateur connecté à une séance. */
  register(session_id: number): void {
    this.users.me().subscribe(user => this.participation.create(user.id, session_id).subscribe({
      next: () => { this.toast.success('Inscription confirmée.'); this.refreshSessions(); },
      error: () => this.toast.error('Impossible de vous inscrire à cette séance.')
    }));
  }
  loadExercises(sessionId: number): void { this.service.exercises(sessionId).subscribe(exercises => this.selectedExercises = exercises); }

  /** Ouvre le formulaire d'édition d'une séance, pré-rempli avec ses valeurs actuelles. */
  startEdit(session: SportSession): void {
    this.editingSessionId = session.id;
    this.editError = '';
    this.editForm.setValue({
      title: session.title,
      starts_at: this.toDatetimeLocal(session.starts_at),
      duration_minutes: session.duration_minutes,
      capacity: session.capacity,
    });
  }

  cancelEdit(): void {
    this.editingSessionId = undefined;
  }

  /** Enregistre les modifications d'une séance (PATCH), puis referme le formulaire d'édition. */
  saveEdit(session: SportSession): void {
    if (this.editForm.invalid) return;
    const value = this.editForm.getRawValue();
    this.service.update(session.id, {
      title: value.title || '',
      starts_at: value.starts_at || '',
      duration_minutes: value.duration_minutes || 60,
      capacity: value.capacity || 20,
    }).subscribe({
      next: (updated) => {
        Object.assign(session, updated);
        this.editingSessionId = undefined;
        this.toast.success('Séance mise à jour.');
      },
      error: () => { this.editError = 'Impossible de modifier cette séance (déjà passée, ou droits insuffisants).'; }
    });
  }

  /** Annule (supprime) une séance après confirmation, réservé au coach responsable ou à un admin. */
  cancelSession(session: SportSession): void {
    if (!confirm(`Annuler la séance « ${session.title} » ? Cette action est irréversible.`)) return;
    this.service.delete(session.id).subscribe({
      next: () => { this.sessions = this.sessions.filter(s => s.id !== session.id); this.toast.success('Séance annulée.'); },
      error: () => this.toast.error('Impossible d’annuler cette séance (déjà passée, ou droits insuffisants).')
    });
  }

  /** Affiche ou masque la liste des inscrits d'une séance, avec leur statut de présence. */
  toggleAttendance(session: SportSession): void {
    if (this.attendanceSessionId === session.id) { this.attendanceSessionId = undefined; return; }
    this.attendanceSessionId = session.id;
    this.attendanceRows = [];
    this.attendanceLoading = true;
    forkJoin([this.participation.list(), this.users.list()]).subscribe({
      next: ([participations, users]) => {
        const names = new Map(users.map(user => [user.id, user.full_name]));
        this.attendanceRows = participations
          .filter(participation => participation.session_id === session.id)
          .map(participation => ({
            participationId: participation.id,
            userId: participation.user_id,
            fullName: names.get(participation.user_id) ?? `Utilisateur #${participation.user_id}`,
            status: participation.status,
          }));
        this.attendanceLoading = false;
      },
      error: () => { this.attendanceLoading = false; this.toast.error('Impossible de charger les inscrits.'); }
    });
  }

  /** Change le statut de présence d'un inscrit (inscrit / présent / absent). */
  setAttendance(row: AttendanceRow, status: string): void {
    if (row.status === status) return;
    const previous = row.status;
    row.status = status;
    this.participation.update(row.participationId, status).subscribe({
      error: () => { row.status = previous; this.toast.error('Impossible de mettre à jour la présence.'); }
    });
  }

  /** Convertit une date ISO serveur (UTC) en valeur locale pour un input datetime-local. */
  private toDatetimeLocal(iso: string): string {
    const date = new Date(iso);
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /** Ouvre le chronomètre de repos pour un exercice, initialisé sur son temps de repos configuré. */
  startTimer(exercise: Exercise): void { this.timerExercise = exercise; this.timerSeconds = exercise.rest_seconds; this.timerRunning = false; this.clearTimer(); }

  /** Démarre ou met en pause le décompte du chronomètre de repos. */
  toggleTimer(): void {
    this.timerRunning = !this.timerRunning;
    if (this.timerRunning) this.timer = this.zone.runOutsideAngular(() => setInterval(() => this.zone.run(() => {
      if (this.timerSeconds > 0) this.timerSeconds--; else { this.timerRunning = false; this.clearTimer(); }
      try { this.appRef.tick(); } catch { /* un tick est déjà en cours */ }
    }), 1000));
    else this.clearTimer();
  }
  resetTimer(): void { if (this.timerExercise) this.timerSeconds = this.timerExercise.rest_seconds; this.timerRunning = false; this.clearTimer(); }
  get formattedTimer(): string { return `${Math.floor(this.timerSeconds / 60).toString().padStart(2, '0')}:${(this.timerSeconds % 60).toString().padStart(2, '0')}`; }
  private clearTimer(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  ngOnDestroy(): void { this.clearTimer(); }
}
