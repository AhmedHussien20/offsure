import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectAssignmentDto } from 'app/core/models/projects/project.models';
import { displayRole } from 'app/core/utils/project-skill.util';

@Component({
  selector: 'app-project-team-summary-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-team-summary-modal.component.html',
  styleUrl: './project-team-summary-modal.component.scss',
})
export class ProjectTeamSummaryModalComponent {
  @Input() projectName = '';
  @Input() members: ProjectAssignmentDto[] = [];
  @Input() pendingSkillNames = '';
  @Input() manageHint = 'Use Team staffing below to add or remove members.';
  @Input() highlightMemberId?: number;

  constructor(public activeModal: NgbActiveModal) {}

  memberInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }

  roleLabel(role: string): string {
    return displayRole(role);
  }
}
