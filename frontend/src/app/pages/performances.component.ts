import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Performance, PerformanceService } from '../services/performance.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { DEMO_MODE } from '../demo-data';

Chart.register(...registerables);

@Component({
  standalone: true,
  imports: [AsyncPipe, DatePipe, DecimalPipe, MatCardModule],
  template: `
    <section class="page">
      @if (demoMode) { <div class="demo-banner"><strong>Mode démonstration</strong><span>Historique et graphique alimentés par des données locales temporaires.</span></div> }
      <div class="page-heading">
        <div><p class="eyebrow">PROGRESSION</p><h1>Performances</h1><p class="text-secondary">Analysez vos résultats au fil des séances.</p></div>
      </div>
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
export class PerformancesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('performanceChart') chartCanvas?: ElementRef<HTMLCanvasElement>;
  readonly performances$ = inject(PerformanceService).list();
  readonly demoMode = DEMO_MODE;
  private chart?: Chart;

  ngAfterViewInit(): void {
    this.performances$.subscribe((performances) => {
      if (performances.length) {
        setTimeout(() => this.renderChart(performances));
      }
    });
  }

  average(items: Performance[]): number {
    return items.length ? items.reduce((sum, item) => sum + item.score, 0) / items.length : 0;
  }

  best(items: Performance[]): number {
    return items.length ? Math.max(...items.map((item) => item.score)) : 0;
  }

  private renderChart(items: Performance[]): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;
    this.chart?.destroy();
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

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
