import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SessionService } from '@features/sessions/session.service';
import { UserService } from '@features/athletes/user.service';

interface WorkoutExerciseForm {
  name: FormControl<string>;
  sets: FormControl<number>;
  repetitions: FormControl<number>;
  rest_seconds: FormControl<number>;
}

type MovementPattern = 'squat' | 'hinge' | 'push' | 'pull' | 'core' | 'carry' | 'conditioning' | 'mobility';
interface LibraryExercise { name: string; category: string; pattern: MovementPattern; }

const PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: 'Squat', hinge: 'Hinge', push: 'Poussée', pull: 'Tirage',
  core: 'Gainage', carry: 'Port de charge', conditioning: 'Cardio', mobility: 'Mobilité',
};
const PATTERN_ORDER: MovementPattern[] = ['squat', 'hinge', 'push', 'pull', 'core', 'carry', 'conditioning', 'mobility'];

@Component({
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="page workout-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">NOUVEL ENTRAÎNEMENT</p>
          <h1>Créer une séance</h1>
          <p class="text-secondary">Composez votre entraînement en choisissant vos exercices.</p>
        </div>
        <a mat-stroked-button routerLink="/sessions">Retour aux séances</a>
      </div>

      <div class="workout-layout">
        <mat-card class="workout-form-card">
          <div class="builder-heading"><div><h2>Détails de la séance</h2><p class="text-secondary">Les champs marqués d’un astérisque sont obligatoires.</p></div></div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="workout-session-fields">
              <mat-form-field appearance="outline"><mat-label>Nom de la séance</mat-label><input matInput formControlName="title" placeholder="Ex. Push &amp; force"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Date et heure</mat-label><input matInput type="datetime-local" formControlName="starts_at"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Durée (min)</mat-label><input matInput type="number" formControlName="duration_minutes"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Places</mat-label><input matInput type="number" formControlName="capacity"></mat-form-field>
            </div>

            <h2 class="section-title">Exercices sélectionnés <span class="status-badge info">{{ exercises.length }}</span></h2>
            <div class="exercise-list" formArrayName="exercises">
              @for (exercise of exercises.controls; track exercise; let index = $index) {
                <div class="exercise-row" [formGroupName]="index">
                  <span class="exercise-pictogram" [attr.aria-label]="exercise.controls.name.value" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      @switch (patternOf(exercise.controls.name.value)) {
                        @case ('squat') { <circle cx="12" cy="4.2" r="1.6" fill="currentColor" stroke="none"/><path d="M12 6v5.5"/><path d="M12 8.3l4-1.3"/><path d="M12 11.5l-4.5 2.5"/><path d="M7.5 14l1 6"/><path d="M12 11.5l4.5 2.5"/><path d="M16.5 14l-1.5 6"/> }
                        @case ('hinge') { <circle cx="16" cy="5.6" r="1.6" fill="currentColor" stroke="none"/><path d="M15.3 7.1l-4.8 5"/><path d="M12.6 9.4v6.2"/><path d="M10.5 12.1l6.5-2.6"/><path d="M10.5 12.1l-1 7.9"/> }
                        @case ('push') { <circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none"/><path d="M12 5.6v7.4"/><path d="M12 7l-3-4"/><path d="M12 7l3-4"/><path d="M12 13l-2 7"/><path d="M12 13l2 7"/> }
                        @case ('pull') { <circle cx="13" cy="5" r="1.6" fill="currentColor" stroke="none"/><path d="M12.6 6.6l-1.6 5.4"/><path d="M16 7.5l2.5 2"/><path d="M18.5 9.5l-4-.5"/><path d="M11 12l-1.5 8"/><path d="M11 12l2.5 7.5"/> }
                        @case ('core') { <circle cx="7" cy="10" r="1.6" fill="currentColor" stroke="none"/><path d="M8.3 11l4.7 2"/><path d="M9.5 11.5l3.5 1"/><path d="M13 13l5-2"/><path d="M18 11l2 4"/> }
                        @case ('carry') { <circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none"/><path d="M12 5.6v6.4"/><path d="M10 7l-.7 6"/><path d="M14 7l.7 6"/><path d="M12 12l-3 4 1 4"/><path d="M12 12l3 3-.5 5"/> }
                        @case ('conditioning') { <circle cx="10" cy="5" r="1.6" fill="currentColor" stroke="none"/><path d="M10.6 6.5l2.4 4.5"/><path d="M12 8l4-4"/><path d="M13 11l-3 3 1 5"/><path d="M13 11l3 2 2 4"/> }
                        @case ('mobility') { <circle cx="16" cy="6" r="1.6" fill="currentColor" stroke="none"/><path d="M15.3 7.4l-4.3 3.1"/><path d="M13 9l-4-1"/><path d="M11 10.5v4.5l4 1"/><path d="M11 10.5l-4 1.5-1 4"/> }
                      }
                    </svg>
                  </span>
                  <mat-form-field appearance="outline"><mat-label>Exercice</mat-label><input matInput formControlName="name"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Séries</mat-label><input matInput type="number" formControlName="sets"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Répétitions</mat-label><input matInput type="number" formControlName="repetitions"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Repos (sec)</mat-label><input matInput type="number" formControlName="rest_seconds"></mat-form-field>
                  <button mat-icon-button type="button" class="danger-action" (click)="removeExercise(index)" aria-label="Supprimer l’exercice">×</button>
                </div>
              } @empty {
                <p class="empty-state">Aucun exercice sélectionné. Choisissez-en un dans la bibliothèque.</p>
              }
            </div>

            @if (error) { <p class="error" role="alert">{{ error }}</p> }
            <div class="builder-actions">
              <button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid || exercises.length === 0">Enregistrer la séance</button>
            </div>
          </form>
        </mat-card>

        <mat-card class="exercise-library">
          <p class="eyebrow">BIBLIOTHÈQUE</p>
          <h2>Choisir un exercice</h2>
          <p class="text-secondary">Parcourez par mouvement et ajoutez-le à votre séance.</p>
          <mat-form-field appearance="outline" class="library-search">
            <mat-label>Rechercher un exercice</mat-label>
            <input matInput [(ngModel)]="searchTerm" [ngModelOptions]="{ standalone: true }" placeholder="Ex. épaules">
          </mat-form-field>

          <div class="pattern-shell">
            <nav class="pattern-rail" aria-label="Filtrer par mouvement">
              @for (pattern of patterns; track pattern) {
                <button type="button" class="pattern-rail-item" [class.active]="pattern === selectedPattern" (click)="selectPattern(pattern)">
                  <span class="pattern-rail-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      @switch (pattern) {
                        @case ('squat') { <circle cx="12" cy="4.2" r="1.6" fill="currentColor" stroke="none"/><path d="M12 6v5.5"/><path d="M12 8.3l4-1.3"/><path d="M12 11.5l-4.5 2.5"/><path d="M7.5 14l1 6"/><path d="M12 11.5l4.5 2.5"/><path d="M16.5 14l-1.5 6"/> }
                        @case ('hinge') { <circle cx="16" cy="5.6" r="1.6" fill="currentColor" stroke="none"/><path d="M15.3 7.1l-4.8 5"/><path d="M12.6 9.4v6.2"/><path d="M10.5 12.1l6.5-2.6"/><path d="M10.5 12.1l-1 7.9"/> }
                        @case ('push') { <circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none"/><path d="M12 5.6v7.4"/><path d="M12 7l-3-4"/><path d="M12 7l3-4"/><path d="M12 13l-2 7"/><path d="M12 13l2 7"/> }
                        @case ('pull') { <circle cx="13" cy="5" r="1.6" fill="currentColor" stroke="none"/><path d="M12.6 6.6l-1.6 5.4"/><path d="M16 7.5l2.5 2"/><path d="M18.5 9.5l-4-.5"/><path d="M11 12l-1.5 8"/><path d="M11 12l2.5 7.5"/> }
                        @case ('core') { <circle cx="7" cy="10" r="1.6" fill="currentColor" stroke="none"/><path d="M8.3 11l4.7 2"/><path d="M9.5 11.5l3.5 1"/><path d="M13 13l5-2"/><path d="M18 11l2 4"/> }
                        @case ('carry') { <circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none"/><path d="M12 5.6v6.4"/><path d="M10 7l-.7 6"/><path d="M14 7l.7 6"/><path d="M12 12l-3 4 1 4"/><path d="M12 12l3 3-.5 5"/> }
                        @case ('conditioning') { <circle cx="10" cy="5" r="1.6" fill="currentColor" stroke="none"/><path d="M10.6 6.5l2.4 4.5"/><path d="M12 8l4-4"/><path d="M13 11l-3 3 1 5"/><path d="M13 11l3 2 2 4"/> }
                        @case ('mobility') { <circle cx="16" cy="6" r="1.6" fill="currentColor" stroke="none"/><path d="M15.3 7.4l-4.3 3.1"/><path d="M13 9l-4-1"/><path d="M11 10.5v4.5l4 1"/><path d="M11 10.5l-4 1.5-1 4"/> }
                      }
                    </svg>
                  </span>
                  <span class="pattern-rail-label">{{ patternLabel(pattern) }}</span>
                  <span class="pattern-rail-count">{{ patternCount(pattern) }}</span>
                </button>
              }
            </nav>

            <div class="library-grid">
              @for (exercise of patternExercises; track exercise.name) {
                <button type="button" class="library-item" [class.added]="isAdded(exercise.name)" (click)="addExercise(exercise.name)">
                  @if (isAdded(exercise.name)) { <span class="library-added-badge" aria-hidden="true">✓</span> }
                  <span class="library-pictogram" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      @switch (exercise.pattern) {
                        @case ('squat') { <circle cx="12" cy="4.2" r="1.6" fill="currentColor" stroke="none"/><path d="M12 6v5.5"/><path d="M12 8.3l4-1.3"/><path d="M12 11.5l-4.5 2.5"/><path d="M7.5 14l1 6"/><path d="M12 11.5l4.5 2.5"/><path d="M16.5 14l-1.5 6"/> }
                        @case ('hinge') { <circle cx="16" cy="5.6" r="1.6" fill="currentColor" stroke="none"/><path d="M15.3 7.1l-4.8 5"/><path d="M12.6 9.4v6.2"/><path d="M10.5 12.1l6.5-2.6"/><path d="M10.5 12.1l-1 7.9"/> }
                        @case ('push') { <circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none"/><path d="M12 5.6v7.4"/><path d="M12 7l-3-4"/><path d="M12 7l3-4"/><path d="M12 13l-2 7"/><path d="M12 13l2 7"/> }
                        @case ('pull') { <circle cx="13" cy="5" r="1.6" fill="currentColor" stroke="none"/><path d="M12.6 6.6l-1.6 5.4"/><path d="M16 7.5l2.5 2"/><path d="M18.5 9.5l-4-.5"/><path d="M11 12l-1.5 8"/><path d="M11 12l2.5 7.5"/> }
                        @case ('core') { <circle cx="7" cy="10" r="1.6" fill="currentColor" stroke="none"/><path d="M8.3 11l4.7 2"/><path d="M9.5 11.5l3.5 1"/><path d="M13 13l5-2"/><path d="M18 11l2 4"/> }
                        @case ('carry') { <circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none"/><path d="M12 5.6v6.4"/><path d="M10 7l-.7 6"/><path d="M14 7l.7 6"/><path d="M12 12l-3 4 1 4"/><path d="M12 12l3 3-.5 5"/> }
                        @case ('conditioning') { <circle cx="10" cy="5" r="1.6" fill="currentColor" stroke="none"/><path d="M10.6 6.5l2.4 4.5"/><path d="M12 8l4-4"/><path d="M13 11l-3 3 1 5"/><path d="M13 11l3 2 2 4"/> }
                        @case ('mobility') { <circle cx="16" cy="6" r="1.6" fill="currentColor" stroke="none"/><path d="M15.3 7.4l-4.3 3.1"/><path d="M13 9l-4-1"/><path d="M11 10.5v4.5l4 1"/><path d="M11 10.5l-4 1.5-1 4"/> }
                      }
                    </svg>
                  </span>
                  <strong>{{ exercise.name }}</strong>
                  <span class="library-pattern-tag">{{ exercise.category }}</span>
                </button>
              } @empty {
                <p class="empty-state">Aucun exercice ne correspond à votre recherche.</p>
              }
            </div>
          </div>
        </mat-card>
      </div>
    </section>
  `
})
export class WorkoutCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sessions = inject(SessionService);
  private readonly users = inject(UserService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    starts_at: ['', Validators.required],
    duration_minutes: [60, [Validators.required, Validators.min(1)]],
    capacity: [20, [Validators.required, Validators.min(1)]],
    exercises: this.fb.array<FormGroup<WorkoutExerciseForm>>([])
  });
  readonly exercises = this.form.controls.exercises;
  readonly library: LibraryExercise[] = [
    { name: 'Squat', category: 'Jambes', pattern: 'squat' },
    { name: 'Développé couché', category: 'Pectoraux', pattern: 'push' },
    { name: 'Soulevé de terre', category: 'Dos · chaîne postérieure', pattern: 'hinge' },
    { name: 'Tractions', category: 'Dos', pattern: 'pull' },
    { name: 'Développé militaire', category: 'Épaules', pattern: 'push' },
    { name: 'Fentes', category: 'Jambes', pattern: 'squat' },
    { name: 'Rowing barre', category: 'Dos', pattern: 'pull' },
    { name: 'Gainage', category: 'Abdominaux', pattern: 'core' },
    { name: 'Presse à cuisses', category: 'Jambes', pattern: 'squat' },
    { name: 'Leg extension', category: 'Jambes', pattern: 'squat' },
    { name: 'Leg curl', category: 'Ischio-jambiers', pattern: 'hinge' },
    { name: 'Hip thrust', category: 'Fessiers', pattern: 'hinge' },
    { name: 'Glute kickback', category: 'Fessiers', pattern: 'hinge' },
    { name: 'Mollets debout', category: 'Mollets', pattern: 'squat' },
    { name: 'Mollets assis', category: 'Mollets', pattern: 'squat' },
    { name: 'Goblet squat', category: 'Jambes', pattern: 'squat' },
    { name: 'Bulgarian split squat', category: 'Jambes', pattern: 'squat' },
    { name: 'Soulevé de terre roumain', category: 'Ischio-jambiers', pattern: 'hinge' },
    { name: 'Good morning', category: 'Ischio-jambiers', pattern: 'hinge' },
    { name: 'Hip hinge', category: 'Chaîne postérieure', pattern: 'hinge' },
    { name: 'Développé incliné haltères', category: 'Pectoraux', pattern: 'push' },
    { name: 'Développé décliné', category: 'Pectoraux', pattern: 'push' },
    { name: 'Écarté haltères', category: 'Pectoraux', pattern: 'push' },
    { name: 'Écarté poulie', category: 'Pectoraux', pattern: 'push' },
    { name: 'Pompes', category: 'Pectoraux', pattern: 'push' },
    { name: 'Dips', category: 'Triceps', pattern: 'push' },
    { name: 'Pull-over', category: 'Pectoraux', pattern: 'push' },
    { name: 'Tirage vertical', category: 'Dos', pattern: 'pull' },
    { name: 'Tirage horizontal', category: 'Dos', pattern: 'pull' },
    { name: 'Rowing haltère', category: 'Dos', pattern: 'pull' },
    { name: 'Rowing poulie basse', category: 'Dos', pattern: 'pull' },
    { name: 'T-bar row', category: 'Dos', pattern: 'pull' },
    { name: 'Pull-up prise supination', category: 'Dos', pattern: 'pull' },
    { name: 'Oiseau haltères', category: 'Épaules', pattern: 'pull' },
    { name: 'Élévations latérales', category: 'Épaules', pattern: 'pull' },
    { name: 'Élévations frontales', category: 'Épaules', pattern: 'push' },
    { name: 'Arnold press', category: 'Épaules', pattern: 'push' },
    { name: 'Face pull', category: 'Épaules', pattern: 'pull' },
    { name: 'Shrugs', category: 'Trapèzes', pattern: 'pull' },
    { name: 'Curl barre', category: 'Biceps', pattern: 'pull' },
    { name: 'Curl incliné', category: 'Biceps', pattern: 'pull' },
    { name: 'Curl marteau', category: 'Biceps', pattern: 'pull' },
    { name: 'Curl pupitre', category: 'Biceps', pattern: 'pull' },
    { name: 'Extension triceps poulie', category: 'Triceps', pattern: 'push' },
    { name: 'Barre au front', category: 'Triceps', pattern: 'push' },
    { name: 'Extension triceps haltère', category: 'Triceps', pattern: 'push' },
    { name: 'Crunch', category: 'Abdominaux', pattern: 'core' },
    { name: 'Crunch poulie', category: 'Abdominaux', pattern: 'core' },
    { name: 'Relevé de jambes', category: 'Abdominaux', pattern: 'core' },
    { name: 'Russian twist', category: 'Abdominaux', pattern: 'core' },
    { name: 'Dead bug', category: 'Abdominaux', pattern: 'core' },
    { name: 'Ab wheel', category: 'Abdominaux', pattern: 'core' },
    { name: 'Planche latérale', category: 'Gainage', pattern: 'core' },
    { name: 'Farmer walk', category: 'Conditionnement', pattern: 'carry' },
    { name: 'Kettlebell swing', category: 'Conditionnement', pattern: 'hinge' },
    { name: 'Battle rope', category: 'Conditionnement', pattern: 'conditioning' },
    { name: 'Burpees', category: 'Conditionnement', pattern: 'conditioning' },
    { name: 'Box jump', category: 'Pliométrie', pattern: 'squat' },
    { name: 'Sauts à la corde', category: 'Cardio', pattern: 'conditioning' },
    { name: 'Course tapis', category: 'Cardio', pattern: 'conditioning' },
    { name: 'Vélo', category: 'Cardio', pattern: 'conditioning' },
    { name: 'Rameur', category: 'Cardio', pattern: 'conditioning' },
    { name: 'Mobilité hanches', category: 'Mobilité', pattern: 'mobility' },
    { name: 'Étirement ischio-jambiers', category: 'Mobilité', pattern: 'mobility' },
    { name: 'Rotation thoracique', category: 'Mobilité', pattern: 'mobility' }
  ];
  readonly patterns = PATTERN_ORDER;
  searchTerm = '';
  selectedPattern: MovementPattern = 'squat';
  error = '';

  get patternExercises(): LibraryExercise[] {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    return this.library.filter((exercise) =>
      exercise.pattern === this.selectedPattern &&
      (!term || `${exercise.name} ${exercise.category}`.toLocaleLowerCase().includes(term))
    );
  }

  patternCount(pattern: MovementPattern): number {
    return this.library.filter((exercise) => exercise.pattern === pattern).length;
  }

  selectPattern(pattern: MovementPattern): void {
    this.selectedPattern = pattern;
  }

  isAdded(name: string): boolean {
    return this.exercises.controls.some((control) => control.controls.name.value === name);
  }

  patternOf(name: string): MovementPattern | undefined {
    return this.library.find((exercise) => exercise.name === name)?.pattern;
  }

  patternLabel(pattern: MovementPattern): string {
    return PATTERN_LABELS[pattern];
  }

  addExercise(name: string): void {
    this.exercises.push(new FormGroup<WorkoutExerciseForm>({
      name: this.fb.nonNullable.control(name, Validators.required),
      sets: this.fb.nonNullable.control(3, [Validators.required, Validators.min(1)]),
      repetitions: this.fb.nonNullable.control(10, [Validators.required, Validators.min(1)]),
      rest_seconds: this.fb.nonNullable.control(90, [Validators.required, Validators.min(0)])
    }));
  }

  removeExercise(index: number): void {
    this.exercises.removeAt(index);
  }

  save(): void {
    this.error = '';
    this.users.me().subscribe({
      next: (user) => {
        const value = this.form.getRawValue();
        this.sessions.create({
          title: value.title || '',
          starts_at: value.starts_at || '',
          duration_minutes: value.duration_minutes || 60,
          capacity: value.capacity || 20,
          coach_id: user.id,
          description: 'Séance de musculation'
        }).subscribe({
          next: (session) => {
            const requests = this.exercises.getRawValue().map((exercise) =>
              this.sessions.addExercise(session.id, {
                name: exercise.name,
                sets: exercise.sets,
                repetitions: exercise.repetitions,
                rest_seconds: exercise.rest_seconds
              })
            );
            let completed = 0;
            requests.forEach((request) => request.subscribe({
              next: () => {
                completed++;
                if (completed === requests.length) void this.router.navigate(['/sessions']);
              },
              error: () => { this.error = 'La séance a été créée, mais un exercice n’a pas pu être enregistré.'; }
            }));
          },
          error: () => { this.error = 'Impossible de créer cette séance. Vérifiez vos droits et les informations saisies.'; }
        });
      },
      error: () => { this.error = 'Votre session a expiré. Veuillez vous reconnecter.'; }
    });
  }
}
