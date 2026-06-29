import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MilestoneStatus,
  ProjectDto,
  ProjectMilestoneDto,
  UpsertProjectMilestoneItemDto,
} from 'app/core/models/projects/project.models';
import { ProjectsService } from 'app/core/services/projects.service';
import {
  getMilestoneDraftValidationIssues,
  milestonePaymentAmount,
  milestonePercentageTotal,
  milestoneStatusLabel,
  milestonesPercentagesValid,
} from 'app/core/utils/project-milestone.util';
import { ToastrService } from 'ngx-toastr';

interface MilestoneDraft extends UpsertProjectMilestoneItemDto {
  localKey: string;
  status?: MilestoneStatus;
}

@Component({
  selector: 'app-admin-project-milestones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-project-milestones.component.html',
  styleUrl: './admin-project-milestones.component.scss',
})
export class AdminProjectMilestonesComponent implements OnChanges {
  @Input({ required: true }) project!: ProjectDto;
  @Input() locked = false;
  @Input() autoEdit = false;
  @Input() canMarkComplete = false;
  @Output() projectChange = new EventEmitter<ProjectDto>();
  @Output() markComplete = new EventEmitter<void>();

  editing = false;
  saving = false;
  listExpanded = false;
  statusUpdatingId: number | null = null;
  drafts: MilestoneDraft[] = [];
  expandedMilestoneIds = new Set<number>();
  private autoEditHandled = false;
  readonly milestonesPercentagesValid = milestonesPercentagesValid;
  readonly milestoneStatus = MilestoneStatus;
  readonly milestoneStatusOptions = [
    { value: MilestoneStatus.NotStarted, label: milestoneStatusLabel(MilestoneStatus.NotStarted) },
    { value: MilestoneStatus.InProgress, label: milestoneStatusLabel(MilestoneStatus.InProgress) },
    { value: MilestoneStatus.Completed, label: milestoneStatusLabel(MilestoneStatus.Completed) },
  ];

  constructor(
    private projectsService: ProjectsService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && !this.editing) {
      this.resetDraftsFromProject();
    }

    if (
      (changes['autoEdit'] || changes['project']) &&
      this.autoEdit &&
      !this.autoEditHandled &&
      !this.locked &&
      this.milestones.length === 0 &&
      this.maxMilestones > 0
    ) {
      this.autoEditHandled = true;
      this.startEditing();
    }
  }

  get milestones(): ProjectMilestoneDto[] {
    return [...(this.project.milestones ?? [])].sort((a, b) => a.order - b.order || a.id - b.id);
  }

  get maxMilestones(): number {
    return this.project.milestoneCount ?? 0;
  }

  get canAddDraft(): boolean {
    return this.drafts.length < this.maxMilestones;
  }

  get hasEditableMilestones(): boolean {
    return this.milestones.some(m => m.status !== MilestoneStatus.Completed);
  }

  get canEditPhases(): boolean {
    return !this.locked && (this.milestones.length === 0 || this.hasEditableMilestones);
  }

  isDraftCompleted(draft: { status?: MilestoneStatus }): boolean {
    return draft.status === MilestoneStatus.Completed;
  }

  isMilestoneCompleted(milestone: ProjectMilestoneDto): boolean {
    return milestone.status === MilestoneStatus.Completed;
  }

  get draftPercentageTotal(): number {
    return milestonePercentageTotal(this.drafts);
  }

  get draftValidationIssues(): string[] {
    return getMilestoneDraftValidationIssues(this.drafts, {
      maxMilestones: this.maxMilestones,
      isInitialDefinition: this.milestones.length === 0,
      projectStartDate: this.project.startDate,
      projectTargetEndDate: this.project.targetEndDate,
      isDraftCompleted: d => this.isDraftCompleted(d),
    });
  }

  get draftsValid(): boolean {
    return this.draftValidationIssues.length === 0;
  }

  get projectStartDate(): string {
    return this.project.startDate?.slice(0, 10) ?? '';
  }

  get projectDeadlineDate(): string {
    return this.project.targetEndDate?.slice(0, 10) ?? '';
  }

  get allocatedPercent(): number {
    return milestonePercentageTotal(this.milestones);
  }

  get completedMilestonesCount(): number {
    return this.milestones.filter(m => m.status === MilestoneStatus.Completed).length;
  }

  get phasesSummaryLabel(): string {
    const total = this.milestones.length;
    if (!total) {
      return '';
    }
    const completed = this.completedMilestonesCount;
    return completed === total
      ? `${total} phase${total === 1 ? '' : 's'} · all complete`
      : `${completed} of ${total} complete`;
  }

  isMilestoneExpanded(id: number): boolean {
    return this.expandedMilestoneIds.has(id);
  }

  toggleListExpanded(): void {
    this.listExpanded = !this.listExpanded;
    if (this.listExpanded) {
      this.expandActiveMilestones();
    }
  }

  toggleMilestoneExpanded(id: number): void {
    if (this.expandedMilestoneIds.has(id)) {
      this.expandedMilestoneIds.delete(id);
    } else {
      this.expandedMilestoneIds.add(id);
    }
  }

  amountFor(percentage: number): number {
    return milestonePaymentAmount(this.project.budget, percentage);
  }

  statusLabel(status: MilestoneStatus): string {
    return milestoneStatusLabel(status);
  }

  statusBadgeClass(status: MilestoneStatus): string {
    switch (status) {
      case MilestoneStatus.InProgress:
        return 'milestone-item__badge--in-progress';
      case MilestoneStatus.Completed:
        return 'milestone-item__badge--completed';
      default:
        return 'milestone-item__badge--not-started';
    }
  }

  startEditing(): void {
    if (this.locked || !this.canEditPhases) return;
    this.listExpanded = true;
    this.resetDraftsFromProject();
    if (!this.drafts.length && this.maxMilestones > 0) {
      this.drafts = Array.from({ length: this.maxMilestones }, (_, index) => this.createEmptyDraft(index + 1));
    } else if (!this.drafts.length && this.canAddDraft) {
      this.addDraft();
    }
    this.editing = true;
  }

  cancelEditing(): void {
    this.editing = false;
    this.resetDraftsFromProject();
  }

  addDraft(): void {
    if (!this.canAddDraft) return;
    const order = this.drafts.length + 1;
    this.drafts = [
      ...this.drafts,
      {
        localKey: `new-${Date.now()}-${order}`,
        name: '',
        description: '',
        order,
        paymentPercentage: 0,
        startDate: '',
        endDate: '',
      },
    ];
  }

  removeDraft(index: number): void {
    if (this.isDraftCompleted(this.drafts[index])) return;
    this.drafts = this.drafts
      .filter((_, i) => i !== index)
      .map((d, i) => ({ ...d, order: i + 1 }));
  }

  saveMilestones(): void {
    if (!this.draftsValid || this.saving) {
      const message =
        this.draftValidationIssues[0] ??
        (this.milestones.length === 0
          ? `Define all ${this.maxMilestones} phases with names, dates, and percentages totaling 100%.`
          : 'Enter names, dates, and percentages that total 100%.');
      this.toastr.warning(message);
      return;
    }

    const payload = this.drafts.map((d, index) => ({
      id: d.id,
      name: d.name.trim(),
      description: d.description?.trim() || undefined,
      order: index + 1,
      paymentPercentage: Number(d.paymentPercentage),
      startDate: d.startDate || undefined,
      endDate: d.endDate || undefined,
    }));

    this.saving = true;
    this.projectsService.upsertMilestones(this.project.id, { milestones: payload }).subscribe({
      next: res => {
        if (res.data) {
          this.projectChange.emit(res.data);
        }
        this.editing = false;
        this.saving = false;
        this.toastr.success('Milestones saved.');
      },
      error: err => {
        this.saving = false;
        this.toastr.error(err?.error?.message || 'Failed to save milestones.');
      },
    });
  }

  updateStatus(milestone: ProjectMilestoneDto, status: MilestoneStatus): void {
    if (this.locked || this.statusUpdatingId != null) return;
    if (milestone.status === MilestoneStatus.Completed) return;
    if (milestone.status === status) return;

    this.statusUpdatingId = milestone.id;
    this.projectsService.updateMilestoneStatus(this.project.id, milestone.id, { status }).subscribe({
      next: res => {
        if (res.data) {
          const previousProgress = this.project.progress ?? 0;
          this.projectChange.emit(res.data);
          if (res.data.status === 'Completed') {
            this.toastr.success('All milestones completed — project marked complete.');
          } else if (status === MilestoneStatus.Completed && (res.data.progress ?? 0) > previousProgress) {
            this.toastr.success(`Milestone completed — project progress updated to ${res.data.progress}%.`);
          } else {
            this.toastr.success('Milestone status updated.');
          }
        }
        this.statusUpdatingId = null;
      },
      error: err => {
        this.statusUpdatingId = null;
        this.toastr.error(err?.error?.message || 'Failed to update milestone status.');
      },
    });
  }

  private resetDraftsFromProject(): void {
    const existing = this.milestones;
    this.drafts = existing.length
      ? existing.map(m => ({
          localKey: `m-${m.id}`,
          id: m.id,
          name: m.name,
          description: m.description ?? '',
          order: m.order,
          paymentPercentage: m.paymentPercentage,
          startDate: m.startDate?.slice(0, 10),
          endDate: m.endDate?.slice(0, 10),
          status: m.status,
        }))
      : [];
  }

  private createEmptyDraft(order: number): MilestoneDraft {
    return {
      localKey: `new-${Date.now()}-${order}`,
      name: '',
      description: '',
      order,
      paymentPercentage: 0,
      startDate: '',
      endDate: '',
    };
  }

  private expandActiveMilestones(): void {
    const active = this.milestones.filter(
      m => m.status === MilestoneStatus.InProgress || m.status === MilestoneStatus.NotStarted
    );
    const toExpand = active.length ? active : this.milestones.slice(0, 1);
    toExpand.forEach(m => this.expandedMilestoneIds.add(m.id));
  }
}
