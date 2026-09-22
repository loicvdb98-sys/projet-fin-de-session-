import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Performance, PerformanceService } from './performance.service';
import { SessionService } from '@features/sessions/session.service';
import { ParticipationService } from '@features/participations/participation.service';
import { UserService } from '@features/athletes/user.service';
import { combineLatest, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { markForCheck } from '@core/mark-for-check.operator';

Chart.register(...registerables);

interface AttendancePoint { title: string; date: string; rate: number; present: number; total: number; }
interface EnrichedPerformance extends Performance { sessionTitle: string; athleteName: string | null; }

/**
 * Écran des performances : score moyen, meilleur score, graphique
 * d'évolution (Chart.js) et historique détaillé. Pour un coach ou un admin,
 * affiche en plus un graphique d'assiduité (taux de présence par séance
 * passée, calculé à partir des participations des séances qu'il gère).
 */
@Component({
  standalone: true,
  imports: [AsyncPipe, DatePipe, DecimalPipe, NgTemplateOutlet, MatCardModule],
  template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">SUIVI</p>
          <h1>Statistiques</h1>
          <p class="text-secondary">{{ isCoach ? 'Assiduité à vos séances et performances de vos sportifs.' : 'Analysez vos résultats au fil des séances.' }}</p>
        </div>
      </div>

      @if (isCoach) {
        <div class="module-shell">
          <nav class="module-rail" aria-label="Sections statistiques">
            <button type="button" class="module-rail-item c-secondary" [class.active]="selectedSection === 'attendance'" (click)="selectSection('attendance')">
              <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></svg></span>
              <span class="module-rail-label">Assiduité</span>
            </button>
            <button type="button" class="module-rail-item c-primary" [class.active]="selectedSection === 'performance'" (click)="selectSection('performance')">
              <span class="module-rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/></svg></span>
              <span class="module-rail-label">Performances</span>
            </button>
          </nav>

          <div class="module-detail">
            @if (selectedSection === 'attendance') {
              <div class="cards">
                <mat-card class="stat-card accent">
                  <mat-card-title>Taux de présence moyen</mat-card-title>
                  <strong class="stat-value">{{ averageAttendance }}%</strong>
                  <p class="text-secondary">sur {{ attendancePoints.length }} séance(s) passée(s)</p>
                </mat-card>
              </div>
              @if (attendancePoints.length) {
                <mat-card class="chart-card">
                  <mat-card-title>Présence par séance</mat-card-title>
                  <mat-card-content><div class="performance-chart"><canvas #attendanceChart aria-label="Graphique du taux de présence par séance"></canvas></div></mat-card-content>
                </mat-card>
                <mat-card class="exercise-summary">
                  <h2>Détail par séance</h2>
                  @for (point of attendancePoints; track point.title + point.date) {
                    <div class="exercise-summary-row">
                      <span><strong>{{ point.title }}</strong><small>{{ point.date | date:'dd/MM/yyyy' }} · {{ point.present }}/{{ point.total }} présent(s)</small></span>
                      <span class="status-badge" [class]="point.rate >= 70 ? 'success' : point.rate >= 40 ? 'info' : 'danger'">{{ point.rate }}%</span>
                    </div>
                  }
                </mat-card>
              } @else {
                <mat-card class="empty-state-card"><h2>Pas encore de données d'assiduité</h2><p class="text-secondary">Les statistiques de présence apparaîtront après vos premières séances passées.</p></mat-card>
              }
            } @else {
              <ng-container *ngTemplateOutlet="performanceBlock"></ng-container>
            }
          </div>
        </div>
      } @else {
        <ng-container *ngTemplateOutlet="performanceBlock"></ng-container>
      }
    </section>

    <ng-template #performanceBlock>
      @if (performances$ | async; as performances) {
        <div class="cards">
          <mat-card class="stat-card accent"><mat-card-title>Score moyen</mat-card-title><strong class="stat-value">{{ average(performances) | number:'1.0-1' }}</strong><p class="text-secondary">sur {{ performances.length }} performance(s)</p></mat-card>
          <mat-card class="stat-card"><mat-card-title>Meilleur score</mat-card-title><strong class="stat-value">{{ best(performances) | number:'1.0-1' }}</strong><p class="text-secondary">{{ isCoach ? 'Meilleur score enregistré' : 'Votre record actuel' }}</p></mat-card>
        </div>
        @if (performances.length) {
          <mat-card class="chart-card"><mat-card-title>Évolution des performances</mat-card-title><mat-card-content><div class="performance-chart"><canvas #performanceChart aria-label="Graphique de progression des performances"></canvas></div></mat-card-content></mat-card>
          <mat-card class="exercise-summary"><h2>Historique</h2>
            @for (item of (enrichedPerformances$ | async) ?? []; track item.id) {
              <div class="exercise-summary-row"><span><strong>{{ item.sessionTitle }}</strong><small>{{ item.athleteName ? item.athleteName + ' · ' : '' }}{{ item.notes || 'Performance enregistrée' }}</small></span><span><strong class="score-value">{{ item.score | number:'1.0-1' }}</strong><small>{{ item.recorded_at | date:'dd/MM/yyyy' }}</small></span></div>
            }
          </mat-card>
        } @else {
          <mat-card class="empty-state-card"><h2>Pas encore de performance</h2><p class="text-secondary">{{ isCoach ? 'Aucune performance enregistrée par vos sportifs pour le moment.' : 'Enregistrez vos premiers résultats pour voir votre progression.' }}</p></mat-card>
        }
      }
    </ng-template>
  `
})
/** Affiche les statistiques de performance (et d'assiduité pour un coach) et pilote les graphiques Chart.js associés. */
export class PerformancesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('performanceChart') chartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('attendanceChart') attendanceCanvas?: ElementRef<HTMLCanvasElement>;
  private readonly users = inject(UserService);
  private readonly sessionService = inject(SessionService);
  private readonly participationService = inject(ParticipationService);
  private readonly cd = inject(ChangeDetectorRef);
  readonly performances$ = inject(PerformanceService).list();
  // Partagé entre ngAfterViewInit (rôle/id courant) et enrichedPerformances$ (noms des sportifs) :
  // une seule requête /users/me même si les deux le consomment.
  private readonly me$ = this.users.me().pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly role$ = this.me$.pipe(map((user) => user.role));
  // Associe chaque performance au titre de sa séance (au lieu d'un simple id) et, pour un coach/admin,
  // au nom du sportif concerné — la liste contient les performances de leurs sportifs, pas les leurs.
  readonly enrichedPerformances$ = combineLatest([
    this.performances$,
    this.sessionService.list().pipe(map((sessions) => new Map(sessions.map((session) => [session.id, session.title])))),
    this.role$.pipe(switchMap((role) => (role === 'coach' || role === 'admin')
      ? this.users.list().pipe(map((users) => new Map(users.map((user) => [user.id, user.full_name]))))
      : of(new Map<number, string>())))
  ]).pipe(
    map(([performances, sessionTitles, athleteNames]): EnrichedPerformance[] => performances.map((item) => ({
      ...item,
      sessionTitle: sessionTitles.get(item.session_id) ?? `Séance #${item.session_id}`,
      athleteName: athleteNames.get(item.user_id) ?? null
    }))),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  private chart?: Chart;
  private attendanceChartInstance?: Chart;

  isCoach = false;
  private isAdmin = false;
  private currentUserId?: number;
  attendancePoints: AttendancePoint[] = [];
  /** Section affichée dans le panneau de droite (coach uniquement, comme le rail du tableau de bord). */
  selectedSection: 'attendance' | 'performance' = 'attendance';
  private latestPerformances: Performance[] = [];

  ngAfterViewInit(): void {
    this.performances$.subscribe((performances) => {
      this.latestPerformances = performances;
      if (performances.length) this.afterRender(() => this.renderChart(performances));
    });
    this.me$.pipe(markForCheck(this.cd)).subscribe((user) => {
      this.isCoach = user.role === 'coach' || user.role === 'admin';
      this.isAdmin = user.role === 'admin';
      this.currentUserId = user.id;
      if (this.isCoach) this.loadAttendance();
    });
  }

  /**
   * Change la section affichée. Le canvas de la section précédente a été retiré du DOM
   * (elle n'était affichée que par un `@if`), il faut donc redessiner son graphique
   * une fois le nouveau contenu rendu.
   */
  selectSection(section: 'attendance' | 'performance'): void {
    this.selectedSection = section;
    this.afterRender(() => {
      if (section === 'attendance' && this.attendancePoints.length) this.renderAttendanceChart();
      if (section === 'performance' && this.latestPerformances.length) this.renderChart(this.latestPerformances);
    });
  }

  /**
   * Attend qu'Angular ait fini de mettre à jour le DOM et que le navigateur ait peint
   * ce changement (double requestAnimationFrame) avant d'exécuter `fn`. Un simple
   * setTimeout(0) peut s'exécuter avant que le canvas nouvellement inséré (derrière un
   * `@if`) n'ait de dimensions définitives, ce qui faisait échouer silencieusement le
   * premier dessin du graphique — un second clic laissait alors le temps au navigateur
   * de rattraper son retard et « réparait » le problème en apparence.
   */
  private afterRender(fn: () => void): void {
    requestAnimationFrame(() => requestAnimationFrame(fn));
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
    forkJoin([this.sessionService.list(), this.participationService.list()]).pipe(markForCheck(this.cd)).subscribe(([sessions, participations]) => {
      const now = new Date();
      const managed = sessions.filter((session) => (this.isAdmin || session.coach_id === this.currentUserId) && new Date(session.starts_at) < now);
      this.attendancePoints = managed
        .map((session) => {
          const rows = participations.filter((participation) => participation.session_id === session.id);
          const present = rows.filter((participation) => participation.status === 'present').length;
          return { title: session.title, date: session.starts_at, present, total: rows.length, rate: rows.length ? Math.round((present / rows.length) * 100) : 0 };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (this.attendancePoints.length) this.afterRender(() => this.renderAttendanceChart());
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
