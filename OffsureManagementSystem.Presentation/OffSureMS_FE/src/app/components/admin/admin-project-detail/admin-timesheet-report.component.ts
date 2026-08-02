import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  HourlyProjectOverviewDto,
  TimesheetReportDto,
  TimesheetReportPeriod,
} from 'app/core/models/timesheets/timesheet.models';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { ProjectsService } from 'app/core/services/projects.service';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import { TimesheetsService } from 'app/core/services/timesheets.service';
import { BreadcrumbService } from 'app/core/services/breadcrumb.service';
import { SharedModule } from 'app/shared/shared.module';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import {
  exportTimesheetReport,
  TimesheetExportContentMode,
  TimesheetExportFormat,
} from 'app/core/utils/timesheet-report-export.util';
import {
  buildResourceSummariesFromReport,
  sumResourceLineCost,
} from 'app/core/utils/timesheet-report.util';

type TimesheetPortal = 'admin' | 'rm' | 'team';

interface TimesheetEntryTableRow {
  id: string;
  workDate: string;
  teamMemberName: string;
  timeRange: string;
  description: string;
  hoursDisplay: string;
}

@Component({
  selector: 'app-admin-timesheet-report',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, FormsModule],
  templateUrl: './admin-timesheet-report.component.html',
  styleUrl: './admin-timesheet-report.component.scss',
})
export class AdminTimesheetReportComponent implements OnInit {
  project: ProjectDto | null = null;
  overview: HourlyProjectOverviewDto | null = null;
  report: TimesheetReportDto | null = null;
  loading = true;
  period: TimesheetReportPeriod = 'Week';
  teamMemberId: number | null = null;
  resourceManagerUserId: number | null = null;
  rangeFrom: string | null = null;
  rangeTo: string | null = null;
  resourcesExpanded = false;
  expandedResourceIds = new Set<number>();
  exportDialogOpen = false;
  pendingExportFormat: TimesheetExportFormat | null = null;
  exportContentMode: TimesheetExportContentMode = 'hoursOnly';
  portal: TimesheetPortal = 'admin';

  readonly resourcePreviewCount = 3;

  readonly defaultPeriod: TimesheetReportPeriod = 'Week';

  readonly periods: { value: TimesheetReportPeriod; label: string }[] = [
    { value: 'Week', label: 'Week' },
    { value: 'Month', label: 'Month' },
    { value: 'FullPeriod', label: 'Full period' },
  ];

  private projectId = 0;

  get dailyTimesheetLink(): (string | number)[] {
    return ['/team', 'projects', this.projectId, 'timesheet'];
  }

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private rmPortal: ResourceManagerPortalService,
    private timesheetsService: TimesheetsService,
    private breadcrumbService: BreadcrumbService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const portal = this.route.snapshot.data['portal'];
    this.portal = portal === 'rm' ? 'rm' : portal === 'team' ? 'team' : 'admin';
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.projectId) {
      this.loading = false;
      return;
    }

    this.loadProject();
  }

  get isRmPortal(): boolean {
    return this.portal === 'rm';
  }

  get isTeamPortal(): boolean {
    return this.portal === 'team';
  }

  get projectDetailLink(): (string | number)[] {
    if (this.isTeamPortal) {
      return ['/team', 'projects', this.projectId];
    }
    return this.isRmPortal
      ? ['/resource-manager', 'projects', this.projectId]
      : ['/admin', 'projects', this.projectId];
  }

  get entryTableData(): TimesheetEntryTableRow[] {
    return (this.report?.rows ?? []).map((row, index) => ({
      id: `${row.workDate}-${row.teamMemberId}-${row.startTime}-${index}`,
      workDate: row.workDate,
      teamMemberName: row.teamMemberName,
      timeRange: `${row.startTime}-${row.endTime}`,
      description: row.description,
      hoursDisplay: row.hours.toFixed(1),
    }));
  }

  get hasEntries(): boolean {
    return this.entryTableData.length > 0;
  }

  get teamMemberOptions(): { id: number; name: string }[] {
    const source = this.isRmPortal
      ? (this.overview?.resources ?? []).map(r => ({ id: r.teamMemberId, name: r.teamMemberName }))
      : (this.project?.teamMembers ?? []).map(m => ({ id: m.teamMemberId, name: m.teamMemberName }));

    const seen = new Set<number>();
    return source.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  get resourceManagerOptions(): { id: number; name: string }[] {
    return (this.project?.resourceManagers ?? []).map(rm => ({
      id: rm.userId,
      name: rm.fullName,
    }));
  }

  get filteredResources() {
    return buildResourceSummariesFromReport(this.report, this.overview, this.project);
  }

  get visibleFilteredResources() {
    if (this.resourcesExpanded) {
      return this.filteredResources;
    }
    return this.filteredResources.slice(0, this.resourcePreviewCount);
  }

  get hiddenResourceCount(): number {
    return Math.max(0, this.filteredResources.length - this.resourcePreviewCount);
  }

  get showResourceExpandToggle(): boolean {
    return this.hiddenResourceCount > 0;
  }

  get filteredHoursLogged(): number {
    return this.report?.totalHours ?? 0;
  }

  get filteredEstimatedRevenue(): number {
    return this.report?.estimatedRevenue ?? 0;
  }

  get activePeriodLabel(): string {
    if (this.rangeFrom && this.rangeTo) {
      return `${this.formatFilterDate(this.rangeFrom)} – ${this.formatFilterDate(this.rangeTo)}`;
    }
    return this.periods.find(p => p.value === this.period)?.label ?? this.period;
  }

  get activeScopeLabel(): string | null {
    if (this.isRmPortal && this.teamMemberId != null) {
      return this.teamMemberOptions.find(m => m.id === this.teamMemberId)?.name ?? null;
    }
    if (!this.isRmPortal && !this.isTeamPortal && this.resourceManagerUserId != null) {
      return this.resourceManagerOptions.find(rm => rm.id === this.resourceManagerUserId)?.name ?? null;
    }
    return null;
  }

  get hasExportData(): boolean {
    return this.filteredResources.length > 0 || this.hasEntries;
  }

  get hasActiveFilters(): boolean {
    if (this.period !== this.defaultPeriod) return true;
    if (this.rangeFrom || this.rangeTo) return true;
    if (this.isRmPortal && this.teamMemberId != null) return true;
    if (!this.isRmPortal && !this.isTeamPortal && this.resourceManagerUserId != null) return true;
    return false;
  }

  toggleResourcesExpanded(): void {
    this.resourcesExpanded = !this.resourcesExpanded;
  }

  toggleResourceEntries(teamMemberId: number): void {
    if (this.expandedResourceIds.has(teamMemberId)) {
      this.expandedResourceIds.delete(teamMemberId);
      return;
    }
    this.expandedResourceIds.add(teamMemberId);
  }

  isResourceEntriesExpanded(teamMemberId: number): boolean {
    return this.expandedResourceIds.has(teamMemberId);
  }

  entriesForResource(teamMemberId: number): TimesheetEntryTableRow[] {
    return (this.report?.rows ?? [])
      .filter(row => row.teamMemberId === teamMemberId)
      .map((row, index) => ({
        id: `${row.workDate}-${row.teamMemberId}-${row.startTime}-${index}`,
        workDate: row.workDate,
        teamMemberName: row.teamMemberName,
        timeRange: `${row.startTime}-${row.endTime}`,
        description: row.description,
        hoursDisplay: row.hours.toFixed(1),
      }));
  }

  entryCountForResource(teamMemberId: number): number {
    return this.entriesForResource(teamMemberId).length;
  }

  get estimatedCost(): number {
    if (this.report?.totalCost != null) return this.report.totalCost;
    return sumResourceLineCost(this.filteredResources);
  }

  get totalHoursLogged(): number {
    if (this.isTeamPortal || this.report) {
      return this.report?.totalHours ?? 0;
    }
    return this.overview?.totalHoursLogged ?? 0;
  }

  resourceLineCost(hours: number, rate: number | null): number {
    return hours * (rate ?? 0);
  }

  onFiltersChange(): void {
    this.resourcesExpanded = false;
    this.expandedResourceIds.clear();
    this.loadReport();
  }

  onPeriodChange(next: TimesheetReportPeriod): void {
    this.period = next;
    this.rangeFrom = null;
    this.rangeTo = null;
    this.resourcesExpanded = false;
    this.expandedResourceIds.clear();
    this.loadReport();
  }

  onCustomRangeChange(): void {
    if (this.rangeFrom && this.rangeTo) {
      this.loadReport();
    }
  }

  clearFilters(): void {
    if (!this.hasActiveFilters) return;

    this.period = this.defaultPeriod;
    this.rangeFrom = null;
    this.rangeTo = null;
    this.teamMemberId = null;
    this.resourceManagerUserId = null;
    this.resourcesExpanded = false;
    this.expandedResourceIds.clear();
    this.loadReport();
  }

  exportReport(format: TimesheetExportFormat): void {
    if (!this.report || !this.hasExportData) {
      this.toastr.warning('No data to export for the current filters.');
      return;
    }

    if (this.isTeamPortal) {
      void this.runExport(format, true, 'hoursOnly');
      return;
    }

    this.pendingExportFormat = format;
    this.exportContentMode = 'hoursOnly';
    this.exportDialogOpen = true;
  }

  closeExportDialog(): void {
    this.exportDialogOpen = false;
    this.pendingExportFormat = null;
  }

  selectExportContentMode(mode: TimesheetExportContentMode): void {
    this.exportContentMode = mode;
  }

  confirmExport(includeTimeEntries: boolean): void {
    const format = this.pendingExportFormat;
    const contentMode = this.exportContentMode;
    this.closeExportDialog();
    if (!format) return;

    if (includeTimeEntries && !this.hasEntries) {
      this.toastr.warning('No time entries to export for this period.');
      return;
    }

    if (!includeTimeEntries && !this.filteredResources.length) {
      this.toastr.warning('No resource hours to export for this period.');
      return;
    }

    void this.runExport(format, includeTimeEntries, contentMode);
  }

  private runExport(
    format: TimesheetExportFormat,
    includeTimeEntries: boolean,
    contentMode: TimesheetExportContentMode
  ): void {
    if (!this.report) return;

    void exportTimesheetReport(format, this.report, this.isTeamPortal ? null : this.overview, {
      contentMode,
      hideRevenue: this.isTeamPortal || this.isRmPortal,
      includeTimeEntries,
      includeTimeColumn: this.isTeamPortal,
      resources: this.filteredResources,
      estimatedCost:
        this.isTeamPortal || contentMode === 'hoursOnly' ? undefined : this.estimatedCost,
    })
      .then(() => {
        this.toastr.success(format === 'excel' ? 'Excel file downloaded.' : 'PDF file downloaded.');
      })
      .catch(() => {
        this.toastr.error('Export failed. Please try again.');
      });
  }

  memberInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }

  private formatFilterDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private loadProject(): void {
    const request$ = this.isTeamPortal
      ? this.projectsService.getTeamMyById(this.projectId)
      : this.isRmPortal
        ? this.rmPortal.getProjectById(this.projectId)
        : this.projectsService.getById(this.projectId);

    request$.subscribe({
      next: res => {
        this.project = res.data ?? null;
        if (!this.project || !isHourlyBudgetProject(this.project)) {
          this.loading = false;
          return;
        }

        this.setBreadcrumbs();
        if (this.isTeamPortal) {
          this.loadReport();
        } else {
          this.loadOverviewAndReport();
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private setBreadcrumbs(): void {
    if (!this.project) return;

    if (this.isTeamPortal) {
      this.breadcrumbService.setTrail(
        [
          { key: 'My Projects', route: ['team', 'projects'] },
          { key: this.project.name, route: ['team', 'projects', this.projectId] },
          'My logged hours',
        ],
        'My logged hours'
      );
      return;
    }

    if (this.isRmPortal) {
      this.breadcrumbService.setTrail(
        [
          { key: 'Projects', route: ['resource-manager', 'projects'] },
          { key: this.project.name, route: ['resource-manager', 'projects', this.projectId] },
          'Hours & costs',
        ],
        'Hours & costs'
      );
      return;
    }

    this.breadcrumbService.setTrail(
      [
        { key: 'Projects', route: ['admin', 'projects'] },
        { key: this.project.name, route: ['admin', 'projects', this.projectId] },
        'Hours & costs',
      ],
      'Hours & costs'
    );
  }

  private loadOverviewAndReport(): void {
    forkJoin({
      overview: this.timesheetsService.getProjectOverview(this.projectId),
      report: this.timesheetsService.getReport(this.buildReportRequest()),
    }).subscribe({
      next: ({ overview, report }) => {
        this.overview = overview.data ?? null;
        this.report = report.data ?? null;
        this.resourcesExpanded = false;
        this.expandedResourceIds.clear();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private loadReport(): void {
    this.loading = true;
    this.timesheetsService.getReport(this.buildReportRequest()).subscribe({
        next: res => {
          this.report = res.data ?? null;
          this.resourcesExpanded = false;
          this.expandedResourceIds.clear();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private buildReportRequest() {
    const useCustomRange = !!(this.rangeFrom && this.rangeTo);
    return {
      projectId: this.projectId,
      period: this.period,
      teamMemberId: this.isRmPortal ? this.teamMemberId ?? undefined : undefined,
      resourceManagerUserId:
        !this.isRmPortal && !this.isTeamPortal ? this.resourceManagerUserId ?? undefined : undefined,
      rangeStart: useCustomRange ? this.rangeFrom! : undefined,
      rangeEnd: useCustomRange ? this.rangeTo! : undefined,
    };
  }
}
