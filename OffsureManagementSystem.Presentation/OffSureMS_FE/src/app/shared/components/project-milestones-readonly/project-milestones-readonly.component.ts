import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MilestoneStatus, ProjectDto, ProjectMilestoneDto } from 'app/core/models/projects/project.models';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import {
  milestonePercentageTotal,
  milestoneStatusLabel,
} from 'app/core/utils/project-milestone.util';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-project-milestones-readonly',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-milestones-readonly.component.html',
  styleUrl: './project-milestones-readonly.component.scss',
})
export class ProjectMilestonesReadonlyComponent {
  @Input({ required: true }) project!: ProjectDto;
  /** When false, phase names, status, and dates only — no payment amounts or budget allocation. */
  @Input() showFinancials = true;
  /** When true, RMs can change phase status via the RM portal API. */
  @Input() allowStatusEdit = false;
  @Input() locked = false;
  @Output() projectChange = new EventEmitter<ProjectDto>();

  listExpanded = false;
  statusUpdatingId: number | null = null;
  expandedMilestoneIds = new Set<number>();
  readonly milestoneStatus = MilestoneStatus;
  readonly milestoneStatusOptions = [
    { value: MilestoneStatus.NotStarted, label: milestoneStatusLabel(MilestoneStatus.NotStarted) },
    { value: MilestoneStatus.InProgress, label: milestoneStatusLabel(MilestoneStatus.InProgress) },
    { value: MilestoneStatus.Completed, label: milestoneStatusLabel(MilestoneStatus.Completed) },
  ];

  constructor(
    private portal: ResourceManagerPortalService,
    private toastr: ToastrService
  ) {}

  get milestones(): ProjectMilestoneDto[] {
    return [...(this.project.milestones ?? [])].sort((a, b) => a.order - b.order || a.id - b.id);
  }

  get maxMilestones(): number {
    return this.project.milestoneCount ?? 0;
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

  isMilestoneCompleted(milestone: ProjectMilestoneDto): boolean {
    return milestone.status === MilestoneStatus.Completed;
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

  updateStatus(milestone: ProjectMilestoneDto, status: MilestoneStatus): void {
    if (!this.allowStatusEdit || this.locked || this.statusUpdatingId != null) return;
    if (milestone.status === MilestoneStatus.Completed) return;
    if (milestone.status === status) return;

    this.statusUpdatingId = milestone.id;
    const previousProgress = this.project.progress ?? 0;

    this.portal.updateMilestoneStatus(this.project.id, milestone.id, { status }).subscribe({
      next: res => {
        if (res.data) {
          this.projectChange.emit(res.data);
          if (res.data.status === 'Completed') {
            this.toastr.success('All phases completed — project marked complete.');
          } else if (status === MilestoneStatus.Completed && (res.data.progress ?? 0) > previousProgress) {
            this.toastr.success(`Phase completed — project progress updated to ${res.data.progress}%.`);
          } else {
            this.toastr.success('Phase status updated.');
          }
        }
        this.statusUpdatingId = null;
      },
      error: err => {
        this.statusUpdatingId = null;
        },
    });
  }

  private expandActiveMilestones(): void {
    const active = this.milestones.filter(
      m => m.status === MilestoneStatus.InProgress || m.status === MilestoneStatus.NotStarted
    );
    const toExpand = active.length ? active : this.milestones.slice(0, 1);
    toExpand.forEach(m => this.expandedMilestoneIds.add(m.id));
  }
}
