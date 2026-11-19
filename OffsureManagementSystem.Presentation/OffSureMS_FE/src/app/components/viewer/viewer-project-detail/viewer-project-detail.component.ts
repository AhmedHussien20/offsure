import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  MilestoneStatus,
  ProjectAssignmentDto,
  ProjectDto,
} from 'app/core/models/projects/project.models';
import { BreadcrumbService } from 'app/core/services/breadcrumb.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { ProjectTeamSummaryModalComponent } from 'app/shared/components/project-team-summary-modal/project-team-summary-modal.component';
import { SharedModule } from 'app/shared/shared.module';
import { projectStatusKey } from 'app/core/utils/enum-status.util';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import { displayRole, summaryProjectAssignments } from 'app/core/utils/project-skill.util';
import { PROJECT_STATUS_BADGES } from 'app/components/admin/admin.constants';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-viewer-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './viewer-project-detail.component.html',
  styleUrl: './viewer-project-detail.component.scss',
})
export class ViewerProjectDetailComponent implements OnInit, OnDestroy {
  project: ProjectDto | null = null;
  loading = true;
  loadError: string | null = null;

  private projectId = 0;
  private readonly destroy$ = new Subject<void>();


  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private breadcrumbService: BreadcrumbService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.projectId = Number(params.get('id'));
      if (!this.projectId) {
        this.loading = false;
        this.loadError = 'Invalid project ID.';
        return;
      }
      this.loadProject();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isHourlyBudget(): boolean {
    return isHourlyBudgetProject(this.project);
  }

  get usesMilestones(): boolean {
    return !!this.project?.usesMilestones && !this.isHourlyBudget;
  }

  get budgetTypeLabel(): string {
    return this.isHourlyBudget ? 'Hourly rate' : 'Fixed total';
  }

  get milestonesPaidLabel(): string {
    const milestones = this.project?.milestones ?? [];
    if (!milestones.length) {
      return '0 / 0';
    }
    const completed = milestones.filter(
      m => m.status === MilestoneStatus.Completed || String(m.status) === 'Completed'
    ).length;
    return `${completed} / ${milestones.length}`;
  }

  get assignedTeam(): ProjectAssignmentDto[] {
    if (!this.project) {
      return [];
    }
    return summaryProjectAssignments(
      this.project.teamMembers ?? [],
      this.project.assignTeamBySkill !== false
    );
  }

  get teamMemberCount(): number {
    return this.assignedTeam.length;
  }

  get salesPersonLabel(): string {
    return this.project?.salesPersonName?.trim() || 'Unassigned';
  }

  get commissionSummary(): string {
    if (!this.project?.salesId) {
      return 'No sales user linked';
    }
    if (this.project.calculatedCommissionAmount != null) {
      return `Est. commission: $${this.project.calculatedCommissionAmount.toLocaleString()}`;
    }
    if (this.project.commissionValue != null) {
      return this.project.commissionType === 'Percentage'
        ? `${this.project.commissionValue}% commission`
        : `$${this.project.commissionValue} fixed commission`;
    }
    return 'Assigned sales user';
  }

  statusBadgeClass(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.text ?? String(status ?? '—');
  }

  milestoneStatusLabel(status: unknown): string {
    if (status === MilestoneStatus.Completed || String(status) === 'Completed') {
      return 'Completed';
    }
    if (status === MilestoneStatus.InProgress || String(status) === 'InProgress') {
      return 'In Progress';
    }
    return 'Pending';
  }

  milestoneStatusBadgeClass(status: unknown): string {
    if (status === MilestoneStatus.Completed || String(status) === 'Completed') {
      return 'bg-success-transparent';
    }
    if (status === MilestoneStatus.InProgress || String(status) === 'InProgress') {
      return 'bg-info-transparent';
    }
    return 'bg-warning-transparent';
  }

  memberInitials(name: string | null | undefined): string {
    const clean = (name || '?').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }

  assignmentRoleLabel(assignment: ProjectAssignmentDto): string {
    return displayRole(assignment.role);
  }

  openTeamSummaryModal(): void {
    if (!this.project) {
      return;
    }
    const modalRef = this.modalService.open(ProjectTeamSummaryModalComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    modalRef.componentInstance.projectName = this.project.name;
    modalRef.componentInstance.members = this.assignedTeam;
    modalRef.componentInstance.manageHint = '';
    modalRef.componentInstance.allowMemberProfile = false;
  }

  private loadProject(): void {
    this.loading = true;
    this.loadError = null;
    this.projectsService
      .getById(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.project = res.data ?? null;
          if (this.project?.name) {
            this.breadcrumbService.setDynamicLabel(this.project.name);
          }
          this.loading = false;
        },
        error: () => {
          this.loadError = 'Unable to load project details.';
          this.loading = false;
        },
      });
  }
}
