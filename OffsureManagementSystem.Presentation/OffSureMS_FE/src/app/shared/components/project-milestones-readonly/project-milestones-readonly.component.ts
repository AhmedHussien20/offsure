import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MilestoneStatus, ProjectDto, ProjectMilestoneDto } from 'app/core/models/projects/project.models';
import {
  milestonePercentageTotal,
  milestoneStatusLabel,
} from 'app/core/utils/project-milestone.util';

@Component({
  selector: 'app-project-milestones-readonly',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-milestones-readonly.component.html',
  styleUrl: './project-milestones-readonly.component.scss',
})
export class ProjectMilestonesReadonlyComponent {
  @Input({ required: true }) project!: ProjectDto;

  readonly milestoneStatus = MilestoneStatus;

  get milestones(): ProjectMilestoneDto[] {
    return [...(this.project.milestones ?? [])].sort((a, b) => a.order - b.order || a.id - b.id);
  }

  get maxMilestones(): number {
    return this.project.milestoneCount ?? 0;
  }

  get allocatedPercent(): number {
    return milestonePercentageTotal(this.milestones);
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
}
