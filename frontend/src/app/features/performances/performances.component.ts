import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Performance, PerformanceService } from './performance.service';
import { SessionService } from '@features/sessions/session.service';
import { ParticipationService } from '@features/participations/participation.service';
import { UserService } from '@features/athletes/user.service';
import { forkJoin } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface AttendancePoint { title: string; date: string; rate: number; present: number; total: number; }

/**
 * Écran des performances : score moyen, meilleur score, graphique
 * d'évolution (Chart.js) et historique détaillé. Pour un coach ou un admin,
 * affiche en plus un graphique d'assiduité (taux de présence par séance
 * passée, calculé à partir des participations des séances qu'il gère).
 */
@Component({
  standalone: true,
  imports: [AsyncPipe, DatePipe, DecimalPipe, MatCardModule],
  template: `
    <section class="page">
      <div class="page-heading">
        <div><p class="eyebrow">PROGRESSION</p><h1>Performances</h1><p class="text-secondary">Analysez vos résultats au fil des séances.</p></div>
      </div>

      @if (isCoach) {
        <div class="cards">
          <mat-card class="stat-card accent">
            <mat-card-title>Taux de présence moyen</mat-card-title>
            <strong class="stat-value">{{ averageAttendance }}%</strong>
            <p class="text-secondary">sur {{ attendancePoints.length }} séance(s) passée(s)</p>
          </mat-card>
        </div>
        @if (attendancePoints.length) {
          <mat-card class="chart-card">
            <mat-card-title>Assiduité par séance</mat-card-title>
            <mat-card-content><div class="performance-chart"><canvas #attendanceChart aria-label="Graphique du taux de présence par séance"></canvas></div></mat-card-content>
          </mat-card>
        } @else {
          <mat-card class="empty-state-card"><h2>Pas encore de données d'assiduité</h2><p class="text-secondary">Les statistiques de présence apparaîtront après vos premières séances passées.</p></mat-card>
        }
      }

      @if (performances$ | async; as performances) {
        <div class="cards">
          <mat-card class="stat-card accent"><mat-card-title>Score moyen</mat-card-title><strong class="stat-value">{{ average(performances) | number:'1.0-1' }}</strong><p class="text-secondary">sur {{ performances.length }} performance(s)</p></mat-card>
          <mat-card class="stat-card"><mat-card-title>Meilleur score</mat-card-title><strong class="stat-value">{{ best(performances) | number:'1.0-1' }}</strong><p class="text-secondary">Votre record actuel</p></mat-card>
        </div>
        @if (performances.length) {
          <mat-card class="chart-card"><mat-card-title>Évolution des performances</mat-card-title><mat-card-content><div class="performance-chart"><canvas #performanceChart aria-label="Graphique de progression des performances"></canvas></div></mat-card-content></mat-card>
          <mat-card class="exercise-summary"><h2>Historique</h2>
            @for (item of performances; track item.id) {
              <div class="exercise-summary-row"><span><strong>Séance #{{ item.session_id }}</strong><small>{{ item.notes || 'Performance enregistrée' }}</small></span><span><strong class="score-value">{{ item.score | number:'1.0-1' }}</strong><small>{{ item.recorded_at | date:'dd/MM/yyyy' }}</small></span></div>
            }
          </mat-card>
        } @else {
          <mat-card class="empty-state-card"><h2>Pas encore de performance</h2><p class="text-secondary">Enregistrez vos premiers résultats pour voir votre progression.</p></mat-card>
        }
      }
    </section>
  `
})
/** Affiche les statistiques de performance (et d'assiduité pour un coach) et pilote les graphiques Chart.js associés. */
export class PerformancesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('performanceChart') chartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('attendanceChart') attendanceCanvas?: ElementRef<HTMLCanvasElement>;
  private readonly users = inject(UserService);
  private readonly sessionService = inject(SessionService);
  private readonly participationService = inject(ParticipationService);
  readonly performances$ = inject(PerformanceService).list();
  private chart?: Chart;
  private attendanceChartInstance?: Chart;

  isCoach = false;
  private isAdmin = false;
  private currentUserId?: number;
  attendancePoints: AttendancePoint[] = [];

  ngAfterViewInit(): void {
    this.performances$.subscribe((performances) => {
      if (performances.length) setTimeout(() => this.renderChart(performances));
    });
    this.users.me().subscribe((user) => {
      this.isCoach = user.role === 'coach' || user.role === 'admin';
      this.isAdmin = user.role === 'admin';
      this.currentUserId = user.id;
      if (this.isCoach) this.loadAttendance();
    });
  }

  average(items: Performance[]): number {
    return items.length ? items.reduce((sum, item) => sum + item.score, 0) / items.length : 0;
  }

  best(items: Performance[]): number {
    return items.length ? Math.max(...items.map((item) => item.score)) : 0;
  }

  get averageAttendance(): number {
    if (!this.attendancePoints.length) return 0;
    return Math.round(this.attendancePoints.reduce((sum, point) => sum + point.rate, 0) / this.attendancePoints.length);
  }

  /**
   * Calcule le taux de présence (présents / inscrits) de chaque séance passée
   * gérée par le coach connecté (toutes les séances pour un admin), triées
   * chronologiquement, puis dessine le graphique correspondant.
   */
  private loadAttendance(): void {
    forkJoin([this.sessionService.list(), this.participationService.list()]).subscribe(([sessions, participations]) => {
      const now = new Date();
      const managed = sessions.filter((session) => (this.isAdmin || session.coach_id === this.currentUserId) && new Date(session.starts_at) < now);
      this.attendancePoints = managed
        .map((session) => {
          const rows = participations.filter((participation) => participation.session_id === session.id);
          const present = rows.filter((participation) => participation.status === 'present').length;
          return { title: session.title, date: session.starts_at, present, total: rows.length, rate: rows.length ? Math.round((present / rows.length) * 100) : 0 };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (this.attendancePoints.length) setTimeout(() => this.renderAttendanceChart());
    });
  }

  /** Construit (ou reconstruit) le graphique en ligne des scores dans le temps. */
  private renderChart(items: Performance[]): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;
    this.chart?.destroy();
    // Lit les couleurs directement depuis les variables CSS du thème courant (clair/sombre)
    // pour que le graphique Chart.js reste cohérent avec le reste de l'interface.
    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue('--text-secondary').trim();
    const gridColor = styles.getPropertyValue('--border-default').trim();
    const accent = styles.getPropertyValue('--accent-primary').trim();
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: items.map((item) => new Date(item.recorded_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })),
        datasets: [{
          label: 'Score',
          data: items.map((item) => item.score),
          borderColor: accent,
          backgroundColor: `${accent}22`,
          pointBackgroundColor: accent,
          pointRadius: 5,
          fill: true,
          tension: .35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor } } },
        scales: {
          y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
          x: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    };
    this.chart = new Chart(canvas, config);
  }

  /** Construit le graphique en barres du taux de présence par séance passée. */
  private renderAttendanceChart(): void {
    const canvas = this.attendanceCanvas?.nativeElement;
    if (!canvas) return;
    this.attendanceChartInstance?.destroy();
    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue('--text-secondary').trim();
    const gridColor = styles.getPropertyValue('--border-default').trim();
    const accent = styles.getPropertyValue('--accent-secondary').trim();
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: this.attendancePoints.map((point) => new Date(point.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })),
        datasets: [{
          label: 'Présence (%)',
          data: this.attendancePoints.map((point) => point.rate),
          backgroundColor: accent,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { color: textColor }, grid: { color: gridColor } },
          x: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    };
    this.attendanceChartInstance = new Chart(canvas, config);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.attendanceChartInstance?.destroy();
  }
}
