import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SessionService } from '../services/session.service';
import { UserService } from '../services/user.service';

interface WorkoutExerciseForm {
  name: FormControl<string>;
  sets: FormControl<number>;
  repetitions: FormControl<number>;
  rest_seconds: FormControl<number>;
}

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
                  <span class="exercise-number">{{ index + 1 }}</span>
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
          <p class="text-secondary">Ajoutez rapidement un mouvement à votre séance.</p>
          <mat-form-field appearance="outline" class="library-search">
            <mat-label>Rechercher un exercice</mat-label>
            <input matInput [(ngModel)]="searchTerm" [ngModelOptions]="{ standalone: true }" placeholder="Ex. épaules">
          </mat-form-field>
          <div class="category-filters" role="group" aria-label="Filtrer par groupe musculaire">
            <button type="button" [class.active-filter]="selectedCategory === 'Tous'" (click)="selectedCategory = 'Tous'">Tous</button>
            @for (category of categories; track category) {
              <button type="button" [class.active-filter]="selectedCategory === category" (click)="selectedCategory = category">{{ category }}</button>
            }
          </div>
          <div class="library-list">
            @for (exercise of filteredLibrary; track exercise.name) {
              <button type="button" class="library-item" (click)="addExercise(exercise.name)">
                <span class="session-icon" aria-hidden="true">{{ exercise.icon }}</span>
                <span><strong>{{ exercise.name }}</strong><small>{{ exercise.category }}</small></span>
                <span class="library-add" aria-hidden="true">+</span>
              </button>
            } @empty { <p class="empty-state">Aucun exercice ne correspond à votre recherche.</p> }
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
  readonly library = [
    { name: 'Squat', category: 'Jambes', icon: '🦵' },
    { name: 'Développé couché', category: 'Pectoraux', icon: '🏋' },
    { name: 'Soulevé de terre', category: 'Dos · chaîne postérieure', icon: '💪' },
    { name: 'Tractions', category: 'Dos', icon: '⚡' },
    { name: 'Développé militaire', category: 'Épaules', icon: '🔥' },
    { name: 'Fentes', category: 'Jambes', icon: '🏃' },
    { name: 'Rowing barre', category: 'Dos', icon: '🎯' },
    { name: 'Gainage', category: 'Abdominaux', icon: '🧘' },
    { name: 'Presse à cuisses', category: 'Jambes', icon: '🦿' },
    { name: 'Leg extension', category: 'Jambes', icon: '🦵' },
    { name: 'Leg curl', category: 'Ischio-jambiers', icon: '🔩' },
    { name: 'Hip thrust', category: 'Fessiers', icon: '🍑' },
    { name: 'Glute kickback', category: 'Fessiers', icon: '🏋' },
    { name: 'Mollets debout', category: 'Mollets', icon: '👟' },
    { name: 'Mollets assis', category: 'Mollets', icon: '👟' },
    { name: 'Goblet squat', category: 'Jambes', icon: '🏋' },
    { name: 'Bulgarian split squat', category: 'Jambes', icon: '🦵' },
    { name: 'Soulevé de terre roumain', category: 'Ischio-jambiers', icon: '💪' },
    { name: 'Good morning', category: 'Ischio-jambiers', icon: '🌅' },
    { name: 'Hip hinge', category: 'Chaîne postérieure', icon: '🔗' },
    { name: 'Développé incliné haltères', category: 'Pectoraux', icon: '🏋' },
    { name: 'Développé décliné', category: 'Pectoraux', icon: '🏋' },
    { name: 'Écarté haltères', category: 'Pectoraux', icon: '🪽' },
    { name: 'Écarté poulie', category: 'Pectoraux', icon: '〰' },
    { name: 'Pompes', category: 'Pectoraux', icon: '🤸' },
    { name: 'Dips', category: 'Triceps', icon: '⚡' },
    { name: 'Pull-over', category: 'Pectoraux', icon: '🔄' },
    { name: 'Tirage vertical', category: 'Dos', icon: '⬇' },
    { name: 'Tirage horizontal', category: 'Dos', icon: '↔' },
    { name: 'Rowing haltère', category: 'Dos', icon: '🎯' },
    { name: 'Rowing poulie basse', category: 'Dos', icon: '↔' },
    { name: 'T-bar row', category: 'Dos', icon: '🔱' },
    { name: 'Pull-up prise supination', category: 'Dos', icon: '⚡' },
    { name: 'Oiseau haltères', category: 'Épaules', icon: '🪽' },
    { name: 'Élévations latérales', category: 'Épaules', icon: '↗' },
    { name: 'Élévations frontales', category: 'Épaules', icon: '⬆' },
    { name: 'Arnold press', category: 'Épaules', icon: '🔥' },
    { name: 'Face pull', category: 'Épaules', icon: '🎯' },
    { name: 'Shrugs', category: 'Trapèzes', icon: '💪' },
    { name: 'Curl barre', category: 'Biceps', icon: '💪' },
    { name: 'Curl incliné', category: 'Biceps', icon: '🔒' },
    { name: 'Curl marteau', category: 'Biceps', icon: '🔨' },
    { name: 'Curl pupitre', category: 'Biceps', icon: '📐' },
    { name: 'Extension triceps poulie', category: 'Triceps', icon: '⬇' },
    { name: 'Barre au front', category: 'Triceps', icon: '🏋' },
    { name: 'Extension triceps haltère', category: 'Triceps', icon: '💪' },
    { name: 'Crunch', category: 'Abdominaux', icon: '🔁' },
    { name: 'Crunch poulie', category: 'Abdominaux', icon: '🔁' },
    { name: 'Relevé de jambes', category: 'Abdominaux', icon: '⬆' },
    { name: 'Russian twist', category: 'Abdominaux', icon: '🔄' },
    { name: 'Dead bug', category: 'Abdominaux', icon: '🧘' },
    { name: 'Ab wheel', category: 'Abdominaux', icon: '⭕' },
    { name: 'Planche latérale', category: 'Gainage', icon: '↔' },
    { name: 'Farmer walk', category: 'Conditionnement', icon: '🚶' },
    { name: 'Kettlebell swing', category: 'Conditionnement', icon: '🔔' },
    { name: 'Battle rope', category: 'Conditionnement', icon: '〰' },
    { name: 'Burpees', category: 'Conditionnement', icon: '⚡' },
    { name: 'Box jump', category: 'Pliométrie', icon: '⬆' },
    { name: 'Sauts à la corde', category: 'Cardio', icon: '⏱' },
    { name: 'Course tapis', category: 'Cardio', icon: '🏃' },
    { name: 'Vélo', category: 'Cardio', icon: '🚴' },
    { name: 'Rameur', category: 'Cardio', icon: '🚣' },
    { name: 'Mobilité hanches', category: 'Mobilité', icon: '🧘' },
    { name: 'Étirement ischio-jambiers', category: 'Mobilité', icon: '🧘' },
    { name: 'Rotation thoracique', category: 'Mobilité', icon: '🔄' }
  ];
  searchTerm = '';
  selectedCategory = 'Tous';
  error = '';

  get categories(): string[] {
    return [...new Set(this.library.map((exercise) => exercise.category))].sort((a, b) => a.localeCompare(b));
  }

  get filteredLibrary() {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    return this.library.filter((exercise) =>
      (this.selectedCategory === 'Tous' || exercise.category === this.selectedCategory) &&
      (!term || `${exercise.name} ${exercise.category}`.toLocaleLowerCase().includes(term))
    );
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
