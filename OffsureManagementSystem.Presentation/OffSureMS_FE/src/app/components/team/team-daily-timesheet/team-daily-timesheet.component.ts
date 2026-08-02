import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  TimesheetEntryDto,
  TimesheetReportRowDto,
  UpdateTimesheetEntryDto,
} from 'app/core/models/timesheets/timesheet.models';
import { BreadcrumbService } from 'app/core/services/breadcrumb.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { TimesheetsService } from 'app/core/services/timesheets.service';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import {
  MonthCalendarCell,
  buildMonthCalendarCells,
  clampIsoDate,
  defaultRangeForHour,
  formatHourLabel,
  formatMonthYearLabel,
  formatTimeRange12h,
  formatTotalLogged,
  hoursBetween,
  isoDateFromApi,
  isTodayIsoDate,
  monthKeyFromIso,
  nowMinutesOfDay,
  shiftMonthKey,
  startOfMonthIso,
  endOfMonthIso,
  timeToMinutes,
  timelineBlockPercents,
  todayIsoDate,
} from 'app/core/utils/timesheet-time.util';
import { SharedModule } from 'app/shared/shared.module';
import { TimeStepperInputComponent } from 'app/shared/components/time-stepper-input/time-stepper-input.component';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';

type CalendarView = 'day' | 'month';
type PopupMode = 'add' | 'edit';

interface TimelineBlockView {
  index: number;
  trackId: string;
  topPercent: number;
  heightPercent: number;
  rangeLabel: string;
  description: string;
}

interface MonthDaySummary {
  totalHours: number;
  entries: TimesheetReportRowDto[];
}

interface TimesheetEntryInput {
  startTime: string;
  endTime: string;
  description: string;
}

@Component({
  selector: 'app-team-daily-timesheet',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    TimeStepperInputComponent,
  ],
  templateUrl: './team-daily-timesheet.component.html',
  styleUrl: './team-daily-timesheet.component.scss',
})
export class TeamDailyTimesheetComponent implements OnInit {
  projectId = 0;
  projectName = '';
  projectStartDate = todayIsoDate();
  projectEndDate: string | null = null;
  maxWorkDate = todayIsoDate();
  workDate = todayIsoDate();
  calendarView: CalendarView = 'day';
  calendarMonthKey = monthKeyFromIso(todayIsoDate());

  loading = true;
  loadingMonth = false;
  dayViewReady = false;
  monthViewReady = false;
  saving = false;
  loadError: string | null = null;

  dayEntries: TimesheetEntryDto[] = [];
  totalHours = 0;
  monthDayMap = new Map<string, MonthDaySummary>();
  monthCells: MonthCalendarCell[] = [];

  popupOpen = false;
  popupMode: PopupMode = 'add';
  popupEditing = false;
  editingEntryId = 0;
  popupForm: FormGroup;

  readonly hours = Array.from({ length: 24 }, (_, index) => index);
  readonly hourHeightPx = 56;
  readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly formatHourLabel = formatHourLabel;
  readonly formatTotalLogged = formatTotalLogged;

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private timesheetsService: TimesheetsService,
    private breadcrumbService: BreadcrumbService,
    private confirmDialog: ConfirmDialogService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.popupForm = this.fb.group({
      entries: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.projectId) {
      this.loadError = 'Project not found.';
      this.loading = false;
      return;
    }

    this.loadProject();
  }

  get popupEntries(): FormArray {
    return this.popupForm.get('entries') as FormArray;
  }

  get projectDetailLink(): (string | number)[] {
    return ['/team', 'projects', this.projectId];
  }

  get timesheetHistoryLink(): (string | number)[] {
    return ['/team', 'projects', this.projectId, 'timesheet-report'];
  }

  get popupFieldsDisabled(): boolean {
    return this.popupMode === 'edit' && !this.popupEditing;
  }

  get popupPrimaryLabel(): string {
    if (this.popupMode === 'edit') {
      return this.popupEditing ? 'Save changes' : 'Update';
    }
    return 'Save new entries';
  }

  get totalLoggedLabel(): string {
    return formatTotalLogged(this.totalHours);
  }

  get monthLabel(): string {
    return formatMonthYearLabel(this.calendarMonthKey);
  }

  get selectedDateLabel(): string {
    const date = new Date(`${this.workDate}T00:00:00`);
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }

  get displayBlocks(): TimelineBlockView[] {
    return this.dayEntries.map((entry, index) => {
      const { topPercent, heightPercent } = timelineBlockPercents(entry.startTime, entry.endTime);
      return {
        index,
        trackId: `${entry.id}-${entry.startTime}-${entry.endTime}`,
        topPercent,
        heightPercent: Math.max(heightPercent, 1.1),
        rangeLabel: formatTimeRange12h(entry.startTime, entry.endTime),
        description: entry.description,
      };
    });
  }

  get showNowIndicator(): boolean {
    return this.calendarView === 'day' && isTodayIsoDate(this.workDate);
  }

  get nowTopPercent(): number {
    return (nowMinutesOfDay() / (24 * 60)) * 100;
  }

  get popupTitle(): string {
    return this.popupMode === 'edit' ? 'Time entry' : 'Log time';
  }

  enablePopupEdit(): void {
    this.popupEditing = true;
    this.syncPopupFormDisabled();
  }

  async confirmDeleteEntry(): Promise<void> {
    if (this.popupMode !== 'edit' || !this.editingEntryId || this.saving) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete time entry',
      message: 'Delete this time log? It will be removed from your day total and project reports.',
      confirmLabel: 'Delete entry',
      variant: 'danger',
      icon: 'ti-trash',
    });
    if (!confirmed) return;

    this.saving = true;
    this.timesheetsService.deleteEntry(this.editingEntryId).subscribe({
      next: res => this.onDaySaved(res.data, 'Entry deleted.'),
      error: () => this.onSaveError(),
    });
  }

  setView(view: CalendarView): void {
    if (this.calendarView === view) return;
    const scrollY = window.scrollY;
    this.calendarView = view;
    this.closePopup();
    if (view === 'month') {
      this.calendarMonthKey = monthKeyFromIso(this.workDate);
      this.refreshMonthView(true, scrollY);
    } else {
      this.loadDay(true, scrollY);
    }
    this.restoreScroll(scrollY);
  }

  onDateChange(): void {
    this.workDate = clampIsoDate(this.workDate, this.projectStartDate, this.maxWorkDate);
    const scrollY = window.scrollY;
    this.calendarMonthKey = monthKeyFromIso(this.workDate);
    this.closePopup();
    if (this.calendarView === 'month') {
      this.refreshMonthView(true, scrollY);
    } else {
      this.loadDay(true, scrollY);
    }
    this.restoreScroll(scrollY);
  }

  previousMonth(): void {
    const scrollY = window.scrollY;
    this.calendarMonthKey = shiftMonthKey(this.calendarMonthKey, -1);
    this.refreshMonthView(true, scrollY);
    this.restoreScroll(scrollY);
  }

  nextMonth(): void {
    const scrollY = window.scrollY;
    this.calendarMonthKey = shiftMonthKey(this.calendarMonthKey, 1);
    this.refreshMonthView(true, scrollY);
    this.restoreScroll(scrollY);
  }

  openPopupAtHour(hour: number, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.ensureWorkDateAllowed()) return;
    this.popupMode = 'add';
    this.popupEditing = true;
    this.editingEntryId = 0;
    this.openPopupForNewEntries([defaultRangeForHour(hour)]);
  }

  openPopupFromBlock(index: number, event: MouseEvent): void {
    event.stopPropagation();
    const entry = this.dayEntries[index];
    if (!entry) return;
    this.popupMode = 'edit';
    this.popupEditing = false;
    this.editingEntryId = entry.id;
    this.popupEntries.clear();
    this.popupEntries.push(this.createEntryGroup(entry.startTime, entry.endTime, entry.description));
    this.syncPopupFormDisabled();
    this.popupOpen = true;
  }

  monthCellDisabled(isoDate: string): boolean {
    if (isoDate < this.projectStartDate) return true;
    if (this.projectEndDate && isoDate > this.projectEndDate) return true;
    return false;
  }

  openMonthCell(cell: MonthCalendarCell, event: MouseEvent): void {
    event.stopPropagation();
    if (this.monthCellDisabled(cell.isoDate)) return;
    const scrollY = window.scrollY;
    this.workDate = clampIsoDate(cell.isoDate, this.projectStartDate, this.maxWorkDate);
    this.calendarMonthKey = monthKeyFromIso(this.workDate);
    if (this.monthCellHasLogs(cell.isoDate)) {
      this.setView('day');
      return;
    }
    if (!this.ensureWorkDateAllowed()) return;
    this.popupMode = 'add';
    this.popupEditing = true;
    this.editingEntryId = 0;
    this.loadDayForPopup(this.workDate, true);
    this.restoreScroll(scrollY);
  }

  addMoreLogs(): void {
    const last = this.popupEntries.at(this.popupEntries.length - 1);
    const lastEnd = (last?.get('endTime')?.value as string) ?? '09:00';
    const startMinutes = timeToMinutes(lastEnd);
    const endMinutes = Math.min(startMinutes + 60, 24 * 60 - 10);
    const startTime = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    this.popupEntries.push(this.createEntryGroup(startTime, endTime, ''));
  }

  removePopupRow(index: number): void {
    if (this.popupEntries.length <= 1) {
      this.toastr.warning('Keep at least one time entry.');
      return;
    }
    this.popupEntries.removeAt(index);
  }

  entryDurationLabel(index: number): string {
    const group = this.popupEntries.at(index);
    if (!group) return '—';
    const raw = group.getRawValue() as { startTime: string; endTime: string };
    const hours = hoursBetween(raw.startTime, raw.endTime);
    return hours > 0 ? formatTotalLogged(hours) : '—';
  }

  monthCellHours(isoDate: string): number {
    return this.monthDayMap.get(isoDate)?.totalHours ?? 0;
  }

  monthCellPreview(isoDate: string): string {
    const entries = this.monthDayMap.get(isoDate)?.entries ?? [];
    if (!entries.length) return '';
    if (entries.length === 1) return entries[0].description.trim();
    return `${entries.length} entries`;
  }

  monthCellPreviewTitle(isoDate: string): string {
    const entries = this.monthDayMap.get(isoDate)?.entries ?? [];
    if (!entries.length) return '';
    return entries.map(entry => entry.description.trim()).filter(Boolean).join(' · ');
  }

  monthCellHasLogs(isoDate: string): boolean {
    return (this.monthDayMap.get(isoDate)?.totalHours ?? 0) > 0;
  }

  closePopup(): void {
    this.popupOpen = false;
    this.popupMode = 'add';
    this.popupEditing = false;
    this.editingEntryId = 0;
    this.popupEntries.clear();
  }

  savePopup(): void {
    if (this.saving) return;
    if (!this.ensureWorkDateAllowed()) return;

    if (this.popupMode === 'edit' && !this.popupEditing) {
      this.enablePopupEdit();
      return;
    }

    if (this.popupForm.invalid) {
      this.popupForm.markAllAsTouched();
      return;
    }

    const entries = this.readPopupEntries();
    if (!entries) return;

    this.saving = true;
    if (this.popupMode === 'edit') {
      this.updateEntry(entries[0]);
      return;
    }

    this.appendEntries(entries);
  }

  private readPopupEntries(): TimesheetEntryInput[] | null {
    const rows = this.popupEntries.getRawValue() as Array<{
      startTime: string;
      endTime: string;
      description: string;
    }>;

    const entries: TimesheetEntryInput[] = [];
    for (const row of rows) {
      const description = String(row.description ?? '').trim();
      if (!description) {
        this.toastr.warning('Each entry needs a description.');
        return null;
      }
      if (timeToMinutes(row.endTime) <= timeToMinutes(row.startTime)) {
        this.toastr.warning('End time must be after start time for every entry.');
        return null;
      }
      entries.push({
        startTime: row.startTime,
        endTime: row.endTime,
        description,
      });
    }

    return entries;
  }

  private appendEntries(entries: TimesheetEntryInput[]): void {
    this.timesheetsService
      .appendEntries({
        projectId: this.projectId,
        workDate: this.workDate,
        entries,
      })
      .subscribe({
        next: res => this.onDaySaved(res.data, 'Time logged successfully.'),
        error: () => this.onSaveError(),
      });
  }

  private updateEntry(entry: TimesheetEntryInput): void {
    if (!this.editingEntryId) {
      this.saving = false;
      this.toastr.error('Entry not found.');
      return;
    }

    const dto: UpdateTimesheetEntryDto = {
      startTime: entry.startTime,
      endTime: entry.endTime,
      description: entry.description,
    };

    this.timesheetsService.updateEntry(this.editingEntryId, dto).subscribe({
      next: res => this.onDaySaved(res.data, 'Entry updated.'),
      error: () => this.onSaveError(),
    });
  }

  private onDaySaved(
    day: { entries?: TimesheetEntryDto[]; totalHours?: number } | null | undefined,
    successMessage: string
  ): void {
    this.dayEntries = day?.entries ?? [];
    this.totalHours = day?.totalHours ?? 0;
    this.saving = false;
    this.closePopup();
    this.toastr.success(successMessage);
    this.syncMonthSummaryForWorkDate();
  }

  private onSaveError(): void {
    this.saving = false;
  }

  private syncMonthSummaryForWorkDate(): void {
    if (monthKeyFromIso(this.workDate) === this.calendarMonthKey) {
      this.refreshMonthView(true);
    }
  }

  private ensureWorkDateAllowed(): boolean {
    if (this.workDate < this.projectStartDate) {
      this.toastr.warning('Cannot log time before the project start date.');
      return false;
    }
    if (this.projectEndDate && this.workDate > this.projectEndDate) {
      this.toastr.warning('Cannot log time after the project end date.');
      return false;
    }
    if (this.workDate > this.maxWorkDate) {
      this.toastr.warning('Cannot log time for future dates.');
      return false;
    }
    return true;
  }

  private openPopupForNewEntries(
    ranges: Array<{ startTime: string; endTime: string; description: string }>
  ): void {
    this.popupEntries.clear();
    for (const range of ranges) {
      this.popupEntries.push(this.createEntryGroup(range.startTime, range.endTime, range.description));
    }
    if (this.popupEntries.length === 0) {
      this.popupEntries.push(this.createEntryGroup('09:00', '10:00', ''));
    }
    this.syncPopupFormDisabled();
    this.popupOpen = true;
  }

  private syncPopupFormDisabled(): void {
    if (this.popupFieldsDisabled) {
      this.popupForm.disable({ emitEvent: false });
    } else {
      this.popupForm.enable({ emitEvent: false });
    }
  }

  private createEntryGroup(start: string, end: string, description: string): FormGroup {
    return this.fb.group({
      startTime: [start, Validators.required],
      endTime: [end, Validators.required],
      description: [description, Validators.required],
    });
  }

  private refreshMonthView(silent = false, scrollY?: number): void {
    this.monthCells = buildMonthCalendarCells(this.calendarMonthKey, this.workDate);
    this.loadMonthSummary(silent, scrollY);
  }

  private loadDayForPopup(isoDate: string, openAdd: boolean): void {
    this.timesheetsService.getDay(this.projectId, isoDate).subscribe({
      next: res => {
        this.dayEntries = res.data?.entries ?? [];
        this.totalHours = res.data?.totalHours ?? 0;
        if (openAdd) {
          this.openPopupForNewEntries([defaultRangeForHour(9)]);
        }
      },
      error: () => {
        this.dayEntries = [];
        this.totalHours = 0;
        if (openAdd) {
          this.openPopupForNewEntries([defaultRangeForHour(9)]);
        }
      },
    });
  }

  private loadProject(): void {
    this.loading = true;
    this.loadError = null;

    this.projectsService.getTeamMyById(this.projectId).subscribe({
      next: res => {
        const project = res.data;
        if (!project || !isHourlyBudgetProject(project)) {
          this.loadError = 'Time logging is only available for hourly projects.';
          this.loading = false;
          return;
        }

        this.projectName = project.name;
        this.projectStartDate = isoDateFromApi(project.startDate) ?? todayIsoDate();
        const endFromProject = isoDateFromApi(project.endDate ?? project.targetEndDate);
        const endFromMilestones = this.resolveMilestoneEndDate(project);
        const resolvedEnd = endFromMilestones ?? endFromProject;
        this.projectEndDate = resolvedEnd;
        const today = todayIsoDate();
        this.maxWorkDate =
          resolvedEnd && resolvedEnd < today ? resolvedEnd : today;
        this.workDate = clampIsoDate(this.workDate, this.projectStartDate, this.maxWorkDate);
        this.calendarMonthKey = monthKeyFromIso(this.workDate);

        this.breadcrumbService.setTrail(
          [
            { key: 'My Projects', route: ['team', 'projects'] },
            { key: project.name, route: ['team', 'projects', this.projectId] },
            'Daily timesheet',
          ],
          'Daily timesheet'
        );
        this.loadDay();
      },
      error: err => {
        this.loadError = err?.error?.message || 'Failed to load project.';
        this.loading = false;
      },
    });
  }

  private loadDay(silent = false, scrollY?: number): void {
    if (!silent) {
      this.loading = true;
    }
    this.timesheetsService.getDay(this.projectId, this.workDate).subscribe({
      next: res => {
        this.dayEntries = res.data?.entries ?? [];
        this.totalHours = res.data?.totalHours ?? 0;
        this.loading = false;
        this.dayViewReady = true;
        this.monthCells = buildMonthCalendarCells(this.calendarMonthKey, this.workDate);
        if (scrollY !== undefined) {
          this.restoreScroll(scrollY);
        }
      },
      error: () => {
        this.dayEntries = [];
        this.totalHours = 0;
        this.loading = false;
        if (scrollY !== undefined) {
          this.restoreScroll(scrollY);
        }
      },
    });
  }

  private loadMonthSummary(silent = false, scrollY?: number): void {
    if (!silent) {
      this.loadingMonth = true;
    }
    const rangeStart = startOfMonthIso(`${this.calendarMonthKey}-01`);
    const rangeEnd = endOfMonthIso(`${this.calendarMonthKey}-01`);

    this.timesheetsService
      .getReport({
        projectId: this.projectId,
        period: 'Month',
        rangeStart,
        rangeEnd,
      })
      .subscribe({
        next: res => {
          const map = new Map<string, MonthDaySummary>();
          for (const row of res.data?.rows ?? []) {
            const existing = map.get(row.workDate) ?? { totalHours: 0, entries: [] };
            existing.totalHours += row.hours;
            existing.entries.push(row);
            map.set(row.workDate, existing);
          }
          this.monthDayMap = map;
          this.loadingMonth = false;
          this.monthViewReady = true;
          if (scrollY !== undefined) {
            this.restoreScroll(scrollY);
          }
        },
        error: () => {
          this.monthDayMap = new Map();
          this.loadingMonth = false;
          if (scrollY !== undefined) {
            this.restoreScroll(scrollY);
          }
        },
      });
  }

  private restoreScroll(scrollY: number): void {
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' as ScrollBehavior });
    });
  }

  private resolveMilestoneEndDate(project: {
    usesMilestones?: boolean;
    milestones?: Array<{ endDate?: string | null }>;
  }): string | null {
    if (!project.usesMilestones || !project.milestones?.length) {
      return null;
    }
    const dates = project.milestones
      .map(m => isoDateFromApi(m.endDate))
      .filter((d): d is string => !!d);
    if (!dates.length) {
      return null;
    }
    return dates.sort().at(-1) ?? null;
  }
}
