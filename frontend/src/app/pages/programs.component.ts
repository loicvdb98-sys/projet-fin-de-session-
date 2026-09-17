import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ProgramService, WorkoutProgram } from '../services/program.service';
import { ToastService } from '../services/toast.service';

@Component({
  standalone: true,
  imports: [AsyncPipe, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="page">
      <div class="page-heading"><div><p class="eyebrow">PLANIFICATION</p><h1>Programmes</h1><p class="text-secondary">Créez des plans réutilisables sur plusieurs semaines.</p></div></div>
      <mat-card><p class="eyebrow">NOUVEAU PROGRAMME</p><h2>Créer un modèle</h2>
        <form class="program-form" [formGroup]="form" (ngSubmit)="create()">
          <mat-form-field appearance="outline"><mat-label>Nom du programme</mat-label><input matInput formControlName="name" placeholder="Ex. Transformation 8 semaines"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Description</mat-label><textarea matInput rows="2" formControlName="description"></textarea></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Nombre de semaines</mat-label><input matInput type="number" formControlName="weeks"></mat-form-field>
          <button mat-flat-button class="primary-action" [disabled]="form.invalid">Créer le programme</button>
        </form>
      </mat-card>
      @if (programs$ | async; as programs) {
        <div class="program-grid">
          @for (program of programs; track program.id) {
            <mat-card class="program-card"><div class="card-heading"><div><p class="eyebrow">{{ program.weeks }} SEMAINES</p><h2>{{ program.name }}</h2></div><button mat-button class="danger-action" (click)="remove(program.id)">Supprimer</button></div><p class="text-secondary">{{ program.description || 'Programme personnalisé prêt à être planifié.' }}</p><div class="program-meta"><span>{{ program.sessions.length }} séance(s) modèle</span><a mat-button class="teal-action" routerLink="/workouts/new">Créer une séance</a></div></mat-card>
          } @empty { <mat-card class="empty-state-card"><h2>Aucun programme</h2><p class="text-secondary">Créez un programme pour organiser votre progression.</p></mat-card> }
        </div>
      }
    </section>
  `
})
export class ProgramsComponent {
  private readonly service = inject(ProgramService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly programs$ = this.service.list();
  readonly form = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.minLength(2)]], description: [''], weeks: [4, [Validators.required, Validators.min(1), Validators.max(52)]] });
  create(): void {
    if (this.form.invalid) return;
    this.service.create({ ...this.form.getRawValue(), sessions: [] }).subscribe({
      next: () => { this.toast.showOnNextLoad('Programme créé.'); location.reload(); },
      error: () => this.toast.error('Impossible de créer ce programme.')
    });
  }
  remove(id: number): void {
    this.service.delete(id).subscribe({
      next: () => { this.toast.showOnNextLoad('Programme supprimé.'); location.reload(); },
      error: () => this.toast.error('Impossible de supprimer ce programme.')
    });
  }
}
