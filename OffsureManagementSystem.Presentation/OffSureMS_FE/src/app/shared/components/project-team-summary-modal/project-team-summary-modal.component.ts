import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectAssignmentDto } from 'app/core/models/projects/project.models';
import { displayRole } from 'app/core/utils/project-skill.util';
import {
  TeamMemberProfileModalComponent,
  TeamMemberProfileSource,
} from '../team-member-profile-modal/team-member-profile-modal.component';

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
  @Input() manageHint = 'Use Team staffing below to add or remove members.';
  @Input() highlightMemberId?: number;
  @Input() profileSource?: TeamMemberProfileSource;
  @Input() allowMemberProfile = true;

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal
  ) {}

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

  isSelf(member: ProjectAssignmentDto): boolean {
    return this.highlightMemberId != null && member.teamMemberId === this.highlightMemberId;
  }

  openMemberProfile(member: ProjectAssignmentDto, event: Event): void {
    event.stopPropagation();
    if (!this.allowMemberProfile || !member.teamMemberId) {
      return;
    }

    const modalRef = this.modalService.open(TeamMemberProfileModalComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
      backdrop: 'static',
    });
    modalRef.componentInstance.memberId = member.teamMemberId;
    if (this.profileSource) {
      modalRef.componentInstance.source = this.profileSource;
    }
  }
}
