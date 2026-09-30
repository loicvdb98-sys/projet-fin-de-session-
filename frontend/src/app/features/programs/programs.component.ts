import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ProgramService, WorkoutProgram } from './program.service';
import { AuthService } from '@features/auth/auth.service';
import { ToastService } from '@shared/services/toast.service';
import { markForCheck } from '@core/mark-for-check.operator';
import { ModuleSkeletonComponent } from '@shared/components/module-skeleton.component';

/**
 * Écran des programmes d'entraînement, au même style « module » que les autres
 * pages : un rail (nouveau programme puis programmes existants) et le détail du
 * programme sélectionné, ou le formulaire de création d'un modèle.
 */
@Component({
  standalone: true,
  imports: [ModuleSkeletonComponent, RouterLink, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="page module-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">PLANIFICATION</p>
          <h1>Programmes</h1>
          <p class="text-secondary">Créez des plans réutilisables sur plusieurs semaines.</p>
        </div>
      </div>

      @if (loading) {
        <app-module-skeleton label="Chargement des programmes…" [rows]="4" />
      } @else if (loadError) {
        <p class="empty-state">Impossible de charger vos programmes. <button mat-button class="teal-action" (click)="load()">Réessayer</button></p>
      } @else {
        <div class="module-shell">
          <nav class="module-rail" aria-label="Programmes">
            <p class="app-rail-section">Nouveau</p>
            <button type="button" class="module-rail-item c-primary" [class.active]="selectedId === null" [attr.aria-current]="selectedId === null ? 'true' : null" (click)="selectedId = null">
              <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></span>
              <span class="module-rail-label">Nouveau programme</span>
            </button>
            @if (programs.length) {
              <p class="app-rail-section">Mes programmes</p>
              @for (program of programs; track program.id) {
                <button type="button" class="module-rail-item c-secondary" [class.active]="selectedId === program.id" [attr.aria-current]="selectedId === program.id ? 'true' : null" (click)="selectedId = program.id">
                  <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8 11h8M8 15h8M8 19h4"/></svg></span>
                  <span class="module-rail-text">
                    <span class="module-rail-label">{{ program.name }}</span>
                    <small class="module-rail-sublabel">{{ program.weeks }} semaine(s) · {{ program.sessions.length }} séance(s) modèle</small>
                  </span>
                </button>
              }
            }
          </nav>

          <div class="module-detail">
            @if (selectedProgram; as program) {
              <div class="module-detail-card c-secondary">
                <div class="module-detail-header">
                  <span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8 11h8M8 15h8M8 19h4"/></svg></span>
                  <div>
                    <p class="eyebrow">PROGRAMME · {{ program.weeks }} SEMAINES</p>
                    <h2>{{ program.name }}</h2>
                  </div>
                  <span class="module-badge">{{ program.weeks }} sem.</span>
                </div>

                <p class="text-secondary">{{ program.description || 'Programme personnalisé prêt à être planifié.' }}</p>
                <span class="module-stat-line text-secondary">{{ program.sessions.length }} séance(s) modèle</span>
                @if (program.sessions.length) {
                  <div class="module-preview-list">
                    @for (session of program.sessions; track $index) {
                      <div class="module-preview-row">
                        <span class="module-preview-row-main"><span class="module-preview-dot"></span>{{ session.title }}</span>
                        @if (session.focus) { <span class="text-secondary">{{ session.focus }}</span> }
                      </div>
                    }
                  </div>
                }

                <div class="module-detail-actions">
                  @if (canCreateSessions) {
                    <a class="action-chip primary" routerLink="/workouts/new">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
                      Créer une séance
                    </a>
                  }
                  <button type="button" class="action-chip danger" (click)="remove(program.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
                    Supprimer le programme
                  </button>
                </div>
              </div>
            } @else {
              <div class="module-detail-card c-primary">
                <div class="module-detail-header">
                  <span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></span>
                  <div>
                    <p class="eyebrow">NOUVEAU PROGRAMME</p>
                    <h2>Créer un modèle</h2>
                  </div>
                </div>
                <p class="text-secondary">{{ programs.length ? 'Donnez un nom et une durée à votre nouveau plan.' : 'Aucun programme pour le moment : créez-en un pour organiser votre progression.' }}</p>
                <form class="module-form" [formGroup]="form" (ngSubmit)="create()">
                  <mat-form-field appearance="outline"><mat-label>Nom du programme</mat-label><input matInput formControlName="name" placeholder="Ex. Transformation 8 semaines"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Description</mat-label><textarea matInput rows="2" formControlName="description"></textarea></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Nombre de semaines</mat-label><input matInput type="number" formControlName="weeks"></mat-form-field>
                  @if (createError) { <p class="error" role="alert">{{ createError }}</p> }
                  <button mat-flat-button class="primary-action" [disabled]="form.invalid">Créer le programme</button>
                </form>
              </div>
            }
          </div>
        </div>
      }
    </section>
  `
})
export class ProgramsComponent {
  private readonly service = inject(ProgramService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly cd = inject(ChangeDetectorRef);
  /** La création de séance (/workouts/new) est réservée aux coachs et admins (coachGuard). */
  readonly canCreateSessions = inject(AuthService).isCoachOrAdmin();
  programs: WorkoutProgram[] = [];
  /** Programme affiché dans le détail ; null = formulaire « Nouveau programme ». */
  selectedId: number | null = null;
  loading = true;
  loadError = false;
  createError = '';
  readonly form = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.minLength(2)]], description: [''], weeks: [4, [Validators.required, Validators.min(1), Validators.max(52)]] });

  constructor() { this.load(); }

  get selectedProgram(): WorkoutProgram | undefined {
    return this.programs.find((program) => program.id === this.selectedId);
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.service.list().pipe(markForCheck(this.cd)).subscribe({
      next: (programs) => {
        this.programs = programs;
        this.selectedId = programs[0]?.id ?? null;
        this.loading = false;
      },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  /** Crée un programme vide (sans séances modèles), l'ajoute en tête de liste et l'affiche. */
  create(): void {
    if (this.form.invalid) return;
    this.createError = '';
    this.service.create({ ...this.form.getRawValue(), sessions: [] }).pipe(markForCheck(this.cd)).subscribe({
      next: (program) => {
        this.programs = [program, ...this.programs];
        this.selectedId = program.id;
        this.form.reset({ name: '', description: '', weeks: 4 });
        this.toast.success('Programme créé.');
      },
      error: () => { this.createError = 'Impossible de créer ce programme.'; }
    });
  }

  /** Supprime un programme, le retire de la liste et affiche le suivant (ou le formulaire). */
  remove(id: number): void {
    this.service.delete(id).pipe(markForCheck(this.cd)).subscribe({
      next: () => {
        this.programs = this.programs.filter((program) => program.id !== id);
        this.selectedId = this.programs[0]?.id ?? null;
        this.toast.success('Programme supprimé.');
      },
      error: () => this.toast.error('Impossible de supprimer ce programme.')
    });
  }
}
