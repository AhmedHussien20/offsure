import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HourlyProjectOverviewDto } from 'app/core/models/timesheets/timesheet.models';
import { TimesheetsService } from 'app/core/services/timesheets.service';

@Component({
  selector: 'app-admin-hourly-project-panel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-hourly-project-panel.component.html',
  styleUrl: './admin-hourly-project-panel.component.scss',
})
export class AdminHourlyProjectPanelComponent implements OnInit, OnChanges {
  @Input() projectId = 0;
  @Input() projectName = '';
  @Input() portal: 'admin' | 'rm' = 'admin';

  overview: HourlyProjectOverviewDto | null = null;
  loading = true;

  constructor(private timesheetsService: TimesheetsService) {}

  get isRmPortal(): boolean {
    return this.portal === 'rm';
  }

  get timesheetReportLink(): (string | number)[] {
    return this.isRmPortal
      ? ['/resource-manager', 'projects', this.projectId, 'timesheet-report']
      : ['/admin', 'projects', this.projectId, 'timesheet-report'];
  }

  get teamEstimatedCost(): number {
    if (!this.overview?.resources.length) return 0;
    return this.overview.resources.reduce((sum, r) => sum + r.totalHours * (r.costRate ?? 0), 0);
  }

  ngOnInit(): void {
    this.loadOverview();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && !changes['projectId'].firstChange) {
      this.loadOverview();
    }
  }

  reload(): void {
    this.loadOverview();
  }

  private loadOverview(): void {
    if (!this.projectId) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.timesheetsService.getProjectOverview(this.projectId).subscribe({
      next: res => {
        this.overview = res.data ?? null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
