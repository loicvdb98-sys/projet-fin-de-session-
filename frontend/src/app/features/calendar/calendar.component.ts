import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { SessionService } from '@features/sessions/session.service';
@Component({ standalone: true, imports: [AsyncPipe, DatePipe, MatCardModule], template: `
<section class="page"><div class="page-heading"><div><p class="eyebrow">ORGANISATION</p><h1>Calendrier</h1><p class="text-secondary">Votre planning des prochaines séances.</p></div></div>
<div class="calendar-list">@for (session of (sessions$ | async) ?? []; track session.id) { <mat-card><strong>{{ session.starts_at | date:'EEEE dd MMMM, HH:mm' }}</strong><h3>{{ session.title }}</h3><span class="text-secondary">{{ session.duration_minutes }} min · {{ session.capacity }} places</span></mat-card> } @empty { <p>Aucune séance planifiée.</p> }</div></section>` })
export class CalendarComponent { readonly sessions$ = inject(SessionService).list(); }
