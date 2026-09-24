import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SessionService } from '@features/sessions/session.service';
import { UserService } from '@features/athletes/user.service';
import { markForCheck } from '@core/mark-for-check.operator';

/**
 * Écran (réservé coach) de création d'une séance de musculation : formulaire
 * de séance, bibliothèque d'exercices filtrable par groupe musculaire/recherche,
 * et enregistrement de la séance avec tous ses exercices.
 */

interface WorkoutExerciseForm {
  name: FormControl<string>;
  sets: FormControl<number>;
  repetitions: FormControl<number>;
  rest_seconds: FormControl<number>;
}

type MuscleGroup = 'legs' | 'glutesHams' | 'back' | 'chest' | 'shoulders' | 'arms' | 'core' | 'cardio';
interface LibraryExercise { name: string; category: string; muscle: MuscleGroup; }

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  legs: 'Jambes', glutesHams: 'Fessiers & Ischios', back: 'Dos', chest: 'Pectoraux',
  shoulders: 'Épaules', arms: 'Bras', core: 'Abdominaux', cardio: 'Cardio & Mobilité',
};
const MUSCLE_ORDER: MuscleGroup[] = ['legs', 'glutesHams', 'back', 'chest', 'shoulders', 'arms', 'core', 'cardio'];
type Tint = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'danger';
const MUSCLE_TINTS: Record<MuscleGroup, Tint> = {
  legs: 'primary', glutesHams: 'warning', back: 'info', chest: 'danger',
  shoulders: 'secondary', arms: 'success', core: 'primary', cardio: 'warning',
};

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
                  <span class="exercise-pictogram" [class]="'c-' + muscleTint(muscleOf(exercise.controls.name.value))" [attr.aria-label]="exercise.controls.name.value" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      @switch (muscleOf(exercise.controls.name.value)) {
                        @case ('legs') { <path d="M8 4h8"/><path d="M10 4l-1.5 16"/><path d="M14 4l1.5 16"/><path d="M6.8 20h3"/><path d="M14.2 20h3"/> }
                        @case ('glutesHams') { <path d="M12 3v4"/><path d="M7 9c0-2 2-3 5-3s5 1 5 3-2 8-5 8-5-6-5-8z"/><path d="M9 17l-1 4"/><path d="M15 17l1 4"/> }
                        @case ('back') { <path d="M12 3v4"/><path d="M8 7l-3 13h4l3-8 3 8h4L16 7"/><path d="M8 7c1.5 1 2.7 1.3 4 1.3S14.5 8 16 7"/> }
                        @case ('chest') { <circle cx="9" cy="10" r="3.4"/><circle cx="15" cy="10" r="3.4"/><path d="M12 8v9"/> }
                        @case ('shoulders') { <path d="M12 6v13"/><path d="M12 6c-2.5-2.5-7-1.5-7 2s3 3.5 3 3.5"/><path d="M12 6c2.5-2.5 7-1.5 7 2s-3 3.5-3 3.5"/> }
                        @case ('arms') { <circle cx="7" cy="5" r="1.8"/><path d="M7 7v6"/><path d="M7 13l4 3"/><circle cx="13" cy="17" r="1.8"/> }
                        @case ('core') { <rect x="8" y="4" width="3.2" height="4" rx="1"/><rect x="12.8" y="4" width="3.2" height="4" rx="1"/><rect x="8" y="9" width="3.2" height="4" rx="1"/><rect x="12.8" y="9" width="3.2" height="4" rx="1"/><rect x="8" y="14" width="3.2" height="4" rx="1"/><rect x="12.8" y="14" width="3.2" height="4" rx="1"/> }
                        @case ('cardio') { <path d="M12 19.5S3.5 14.8 3.5 8.8A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8.5 1.8c0 6-8.5 10.7-8.5 10.7z"/><path d="M5.5 11h2.8l1.5-3 2.2 6 1.5-3h3.5"/> }
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
          <p class="text-secondary">Parcourez par groupe musculaire et ajoutez-le à votre séance.</p>
          <mat-form-field appearance="outline" class="library-search">
            <mat-label>Rechercher un exercice</mat-label>
            <input matInput [(ngModel)]="searchTerm" [ngModelOptions]="{ standalone: true }" placeholder="Ex. épaules">
          </mat-form-field>

          <div class="pattern-shell">
            <nav class="pattern-rail" aria-label="Filtrer par groupe musculaire">
              @for (muscle of muscles; track muscle) {
                <button type="button" class="pattern-rail-item" [class]="'c-' + muscleTint(muscle)" [class.active]="muscle === selectedMuscle" (click)="selectMuscle(muscle)">
                  <span class="pattern-rail-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      @switch (muscle) {
                        @case ('legs') { <path d="M8 4h8"/><path d="M10 4l-1.5 16"/><path d="M14 4l1.5 16"/><path d="M6.8 20h3"/><path d="M14.2 20h3"/> }
                        @case ('glutesHams') { <path d="M12 3v4"/><path d="M7 9c0-2 2-3 5-3s5 1 5 3-2 8-5 8-5-6-5-8z"/><path d="M9 17l-1 4"/><path d="M15 17l1 4"/> }
                        @case ('back') { <path d="M12 3v4"/><path d="M8 7l-3 13h4l3-8 3 8h4L16 7"/><path d="M8 7c1.5 1 2.7 1.3 4 1.3S14.5 8 16 7"/> }
                        @case ('chest') { <circle cx="9" cy="10" r="3.4"/><circle cx="15" cy="10" r="3.4"/><path d="M12 8v9"/> }
                        @case ('shoulders') { <path d="M12 6v13"/><path d="M12 6c-2.5-2.5-7-1.5-7 2s3 3.5 3 3.5"/><path d="M12 6c2.5-2.5 7-1.5 7 2s-3 3.5-3 3.5"/> }
                        @case ('arms') { <circle cx="7" cy="5" r="1.8"/><path d="M7 7v6"/><path d="M7 13l4 3"/><circle cx="13" cy="17" r="1.8"/> }
                        @case ('core') { <rect x="8" y="4" width="3.2" height="4" rx="1"/><rect x="12.8" y="4" width="3.2" height="4" rx="1"/><rect x="8" y="9" width="3.2" height="4" rx="1"/><rect x="12.8" y="9" width="3.2" height="4" rx="1"/><rect x="8" y="14" width="3.2" height="4" rx="1"/><rect x="12.8" y="14" width="3.2" height="4" rx="1"/> }
                        @case ('cardio') { <path d="M12 19.5S3.5 14.8 3.5 8.8A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8.5 1.8c0 6-8.5 10.7-8.5 10.7z"/><path d="M5.5 11h2.8l1.5-3 2.2 6 1.5-3h3.5"/> }
                      }
                    </svg>
                  </span>
                  <span class="pattern-rail-label">{{ muscleLabel(muscle) }}</span>
                  <span class="pattern-rail-count">{{ muscleCount(muscle) }}</span>
                </button>
              }
            </nav>

            <div class="library-grid">
              @for (exercise of muscleExercises; track exercise.name) {
                <button type="button" class="library-item" [class]="'c-' + muscleTint(exercise.muscle)" [class.added]="isAdded(exercise.name)" (click)="addExercise(exercise.name)">
                  @if (isAdded(exercise.name)) { <span class="library-added-badge" aria-hidden="true">✓</span> }
                  <span class="library-pictogram" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      @switch (exercise.muscle) {
                        @case ('legs') { <path d="M8 4h8"/><path d="M10 4l-1.5 16"/><path d="M14 4l1.5 16"/><path d="M6.8 20h3"/><path d="M14.2 20h3"/> }
                        @case ('glutesHams') { <path d="M12 3v4"/><path d="M7 9c0-2 2-3 5-3s5 1 5 3-2 8-5 8-5-6-5-8z"/><path d="M9 17l-1 4"/><path d="M15 17l1 4"/> }
                        @case ('back') { <path d="M12 3v4"/><path d="M8 7l-3 13h4l3-8 3 8h4L16 7"/><path d="M8 7c1.5 1 2.7 1.3 4 1.3S14.5 8 16 7"/> }
                        @case ('chest') { <circle cx="9" cy="10" r="3.4"/><circle cx="15" cy="10" r="3.4"/><path d="M12 8v9"/> }
                        @case ('shoulders') { <path d="M12 6v13"/><path d="M12 6c-2.5-2.5-7-1.5-7 2s3 3.5 3 3.5"/><path d="M12 6c2.5-2.5 7-1.5 7 2s-3 3.5-3 3.5"/> }
                        @case ('arms') { <circle cx="7" cy="5" r="1.8"/><path d="M7 7v6"/><path d="M7 13l4 3"/><circle cx="13" cy="17" r="1.8"/> }
                        @case ('core') { <rect x="8" y="4" width="3.2" height="4" rx="1"/><rect x="12.8" y="4" width="3.2" height="4" rx="1"/><rect x="8" y="9" width="3.2" height="4" rx="1"/><rect x="12.8" y="9" width="3.2" height="4" rx="1"/><rect x="8" y="14" width="3.2" height="4" rx="1"/><rect x="12.8" y="14" width="3.2" height="4" rx="1"/> }
                        @case ('cardio') { <path d="M12 19.5S3.5 14.8 3.5 8.8A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8.5 1.8c0 6-8.5 10.7-8.5 10.7z"/><path d="M5.5 11h2.8l1.5-3 2.2 6 1.5-3h3.5"/> }
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
/** Compose une nouvelle séance à partir d'une bibliothèque d'exercices classés par groupe musculaire. */
export class WorkoutCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sessions = inject(SessionService);
  private readonly users = inject(UserService);
  private readonly router = inject(Router);
  private readonly cd = inject(ChangeDetectorRef);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    starts_at: ['', Validators.required],
    duration_minutes: [60, [Validators.required, Validators.min(1)]],
    capacity: [20, [Validators.required, Validators.min(1)]],
    exercises: this.fb.array<FormGroup<WorkoutExerciseForm>>([])
  });
  readonly exercises = this.form.controls.exercises;
  readonly library: LibraryExercise[] = [
    { name: 'Squat', category: 'Jambes', muscle: 'legs' },
    { name: 'Développé couché', category: 'Pectoraux', muscle: 'chest' },
    { name: 'Soulevé de terre', category: 'Dos · chaîne postérieure', muscle: 'glutesHams' },
    { name: 'Tractions', category: 'Dos', muscle: 'back' },
    { name: 'Développé militaire', category: 'Épaules', muscle: 'shoulders' },
    { name: 'Fentes', category: 'Jambes', muscle: 'legs' },
    { name: 'Rowing barre', category: 'Dos', muscle: 'back' },
    { name: 'Gainage', category: 'Abdominaux', muscle: 'core' },
    { name: 'Presse à cuisses', category: 'Jambes', muscle: 'legs' },
    { name: 'Leg extension', category: 'Jambes', muscle: 'legs' },
    { name: 'Leg curl', category: 'Ischio-jambiers', muscle: 'glutesHams' },
    { name: 'Hip thrust', category: 'Fessiers', muscle: 'glutesHams' },
    { name: 'Glute kickback', category: 'Fessiers', muscle: 'glutesHams' },
    { name: 'Mollets debout', category: 'Mollets', muscle: 'legs' },
    { name: 'Mollets assis', category: 'Mollets', muscle: 'legs' },
    { name: 'Goblet squat', category: 'Jambes', muscle: 'legs' },
    { name: 'Bulgarian split squat', category: 'Jambes', muscle: 'legs' },
    { name: 'Soulevé de terre roumain', category: 'Ischio-jambiers', muscle: 'glutesHams' },
    { name: 'Good morning', category: 'Ischio-jambiers', muscle: 'glutesHams' },
    { name: 'Hip hinge', category: 'Chaîne postérieure', muscle: 'glutesHams' },
    { name: 'Développé incliné haltères', category: 'Pectoraux', muscle: 'chest' },
    { name: 'Développé décliné', category: 'Pectoraux', muscle: 'chest' },
    { name: 'Écarté haltères', category: 'Pectoraux', muscle: 'chest' },
    { name: 'Écarté poulie', category: 'Pectoraux', muscle: 'chest' },
    { name: 'Pompes', category: 'Pectoraux', muscle: 'chest' },
    { name: 'Dips', category: 'Triceps', muscle: 'arms' },
    { name: 'Pull-over', category: 'Pectoraux', muscle: 'chest' },
    { name: 'Tirage vertical', category: 'Dos', muscle: 'back' },
    { name: 'Tirage horizontal', category: 'Dos', muscle: 'back' },
    { name: 'Rowing haltère', category: 'Dos', muscle: 'back' },
    { name: 'Rowing poulie basse', category: 'Dos', muscle: 'back' },
    { name: 'T-bar row', category: 'Dos', muscle: 'back' },
    { name: 'Pull-up prise supination', category: 'Dos', muscle: 'back' },
    { name: 'Oiseau haltères', category: 'Épaules', muscle: 'shoulders' },
    { name: 'Élévations latérales', category: 'Épaules', muscle: 'shoulders' },
    { name: 'Élévations frontales', category: 'Épaules', muscle: 'shoulders' },
    { name: 'Arnold press', category: 'Épaules', muscle: 'shoulders' },
    { name: 'Face pull', category: 'Épaules', muscle: 'shoulders' },
    { name: 'Shrugs', category: 'Trapèzes', muscle: 'shoulders' },
    { name: 'Curl barre', category: 'Biceps', muscle: 'arms' },
    { name: 'Curl incliné', category: 'Biceps', muscle: 'arms' },
    { name: 'Curl marteau', category: 'Biceps', muscle: 'arms' },
    { name: 'Curl pupitre', category: 'Biceps', muscle: 'arms' },
    { name: 'Extension triceps poulie', category: 'Triceps', muscle: 'arms' },
    { name: 'Barre au front', category: 'Triceps', muscle: 'arms' },
    { name: 'Extension triceps haltère', category: 'Triceps', muscle: 'arms' },
    { name: 'Crunch', category: 'Abdominaux', muscle: 'core' },
    { name: 'Crunch poulie', category: 'Abdominaux', muscle: 'core' },
    { name: 'Relevé de jambes', category: 'Abdominaux', muscle: 'core' },
    { name: 'Russian twist', category: 'Abdominaux', muscle: 'core' },
    { name: 'Dead bug', category: 'Abdominaux', muscle: 'core' },
    { name: 'Ab wheel', category: 'Abdominaux', muscle: 'core' },
    { name: 'Planche latérale', category: 'Gainage', muscle: 'core' },
    { name: 'Farmer walk', category: 'Conditionnement', muscle: 'cardio' },
    { name: 'Kettlebell swing', category: 'Conditionnement', muscle: 'glutesHams' },
    { name: 'Battle rope', category: 'Conditionnement', muscle: 'cardio' },
    { name: 'Burpees', category: 'Conditionnement', muscle: 'cardio' },
    { name: 'Box jump', category: 'Pliométrie', muscle: 'legs' },
    { name: 'Sauts à la corde', category: 'Cardio', muscle: 'cardio' },
    { name: 'Course tapis', category: 'Cardio', muscle: 'cardio' },
    { name: 'Vélo', category: 'Cardio', muscle: 'cardio' },
    { name: 'Rameur', category: 'Cardio', muscle: 'cardio' },
    { name: 'Mobilité hanches', category: 'Mobilité', muscle: 'cardio' },
    { name: 'Étirement ischio-jambiers', category: 'Mobilité', muscle: 'cardio' },
    { name: 'Rotation thoracique', category: 'Mobilité', muscle: 'cardio' }
  ];
  readonly muscles = MUSCLE_ORDER;
  searchTerm = '';
  selectedMuscle: MuscleGroup = 'legs';
  error = '';

  /** Exercices de la bibliothèque pour le groupe musculaire sélectionné, filtrés par le terme de recherche. */
  get muscleExercises(): LibraryExercise[] {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    return this.library.filter((exercise) =>
      exercise.muscle === this.selectedMuscle &&
      (!term || `${exercise.name} ${exercise.category}`.toLocaleLowerCase().includes(term))
    );
  }

  muscleCount(muscle: MuscleGroup): number {
    return this.library.filter((exercise) => exercise.muscle === muscle).length;
  }

  selectMuscle(muscle: MuscleGroup): void {
    this.selectedMuscle = muscle;
  }

  /** Indique si un exercice de la bibliothèque a déjà été ajouté au formulaire de séance. */
  isAdded(name: string): boolean {
    return this.exercises.controls.some((control) => control.controls.name.value === name);
  }

  /** Retrouve le groupe musculaire d'un exercice nommé, pour choisir son pictogramme. */
  muscleOf(name: string): MuscleGroup | undefined {
    return this.library.find((exercise) => exercise.name === name)?.muscle;
  }

  muscleLabel(muscle: MuscleGroup): string {
    return MUSCLE_LABELS[muscle];
  }

  /** Couleur associée à un groupe musculaire, pour teinter son icône (rail, carte, pictogramme). */
  muscleTint(muscle: MuscleGroup | undefined): Tint {
    return muscle ? MUSCLE_TINTS[muscle] : 'secondary';
  }

  /** Ajoute un exercice de la bibliothèque au formulaire de séance, avec des valeurs par défaut. */
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

  /**
   * Crée la séance (avec l'utilisateur courant comme coach) puis enregistre
   * chaque exercice individuellement ; redirige vers /sessions une fois tous
   * les exercices confirmés par le serveur.
   */
  save(): void {
    this.error = '';
    this.users.me().pipe(markForCheck(this.cd)).subscribe({
      next: (user) => {
        const value = this.form.getRawValue();
        this.sessions.create({
          title: value.title || '',
          starts_at: value.starts_at || '',
          duration_minutes: value.duration_minutes || 60,
          capacity: value.capacity || 20,
          coach_id: user.id,
          description: 'Séance de musculation'
        }).pipe(markForCheck(this.cd)).subscribe({
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
            requests.forEach((request) => request.pipe(markForCheck(this.cd)).subscribe({
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
