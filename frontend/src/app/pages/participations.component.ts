import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { SessionService } from '../services/session.service';
import { ParticipationService } from '../services/participation.service';
import { ToastService } from '../services/toast.service';
@Component({ standalone: true, imports: [AsyncPipe, MatCardModule, MatButtonModule], template: `
<section class="page"><div class="page-heading"><div><p class="eyebrow">SUIVI</p><h1>Mes participations</h1><p class="text-secondary">Retrouvez vos inscriptions et leur statut.</p></div></div>
@if (items$ | async; as items) { @for (item of items; track item.id) { <mat-card class="list-row"><span>Séance #{{ item.session_id }}</span><span class="status-badge" [class.success]="item.status === 'present'" [class.info]="item.status === 'inscrit'">{{ item.status }}</span><button mat-button (click)="cancel(item.id)">Se désinscrire</button></mat-card> } @empty { <p>Aucune participation.</p> } }</section>` })
export class ParticipationsComponent {
  private readonly service = inject(ParticipationService); readonly items$ = this.service.list();
  private readonly toast = inject(ToastService);
  cancel(id: number): void {
    this.service.remove(id).subscribe({
      next: () => { this.toast.showOnNextLoad('Désinscription confirmée.'); location.reload(); },
      error: () => this.toast.error('Impossible de vous désinscrire de cette séance.')
    });
  }
}
