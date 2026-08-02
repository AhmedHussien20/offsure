import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MilestoneStatus, ProjectAssignmentDto, ProjectDto } from 'app/core/models/projects/project.models';
import { SkillDto } from 'app/core/models/skills/skill.models';
import { SkillsService } from 'app/core/services/skills.service';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import {
  buildProjectSkillSlots,
  directProjectAssignments,
  displayRole,
  ProjectSkillSlotView,
  summaryProjectAssignments,
  usesSkillBasedStaffing,
} from 'app/core/utils/project-skill.util';
import { ProjectMilestonesReadonlyComponent } from '../project-milestones-readonly/project-milestones-readonly.component';
import { ProjectPaymentModalComponent } from '../project-payment-modal/project-payment-modal.component';
import { ProjectTeamSummaryModalComponent } from '../project-team-summary-modal/project-team-summary-modal.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type ProjectDetailAudience = 'client' | 'team';

@Component({
  selector: 'app-project-detail-readonly',
  standalone: true,
  imports: [CommonModule, RouterModule, ProjectMilestonesReadonlyComponent],
  templateUrl: './project-detail-readonly.component.html',
  styleUrl: './project-detail-readonly.component.scss',
})
export class ProjectDetailReadonlyComponent implements OnChanges {
  @Input({ required: true }) project!: ProjectDto;
  @Input() audience: ProjectDetailAudience = 'client';
  @Input() myRole?: string;
  @Input() highlightMemberId?: number;
  @Input() statusBadgeClassFn: (status: unknown) => string = () => 'bg-light';
  @Input() statusLabelFn: (status: unknown) => string = s => String(s ?? '');
  @Input() backLink?: string;
  @Input() backLabel = 'Back';
  @Input() showLogTimeButton = false;
  @Input() timesheetHistoryLink: (string | number)[] | null = null;

  @Output() logTimeClick = new EventEmitter<void>();

  skillSlots: ProjectSkillSlotView[] = [];
  selectedSkillsForDisplay: SkillDto[] = [];

  private skillCatalogById = new Map<number, SkillDto>();

  constructor(
    private skillsService: SkillsService,
    private modalService: NgbModal
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.project) {
      this.refreshSkillCatalog();
    }
  }

  get isClient(): boolean {
    return this.audience === 'client';
  }

  get isTeam(): boolean {
    return this.audience === 'team';
  }

  get isHourlyBudget(): boolean {
    return isHourlyBudgetProject(this.project);
  }

  get usesMilestones(): boolean {
    return !!this.project.usesMilestones && !this.isHourlyBudget;
  }

  /** Milestone phases are internal (admin/RM); never shown to clients. */
  get showMilestones(): boolean {
    return this.usesMilestones && !this.isClient;
  }

  /** Payment invoices/PO are visible to clients only (not team members). */
  get showPayments(): boolean {
    return this.isClient;
  }

  get headerSubtitle(): string {
    if (this.isClient) {
      return this.project.serviceName || '';
    }
    return `${this.project.clientName} · ${this.project.serviceName}`;
  }

  get progressPercent(): number {
    return Math.min(100, Math.max(0, this.project.progress ?? 0));
  }

  get hasRequiredSkills(): boolean {
    return (this.project.requiredSkillIds?.length ?? 0) > 0;
  }

  get usesSkillStaffing(): boolean {
    return usesSkillBasedStaffing(this.project);
  }

  get summaryTeamMembers(): ProjectAssignmentDto[] {
    return summaryProjectAssignments(this.project.teamMembers, this.usesSkillStaffing);
  }

  get unassignedDirectMembers(): ProjectAssignmentDto[] {
    return directProjectAssignments(this.project.teamMembers);
  }

  get teamMemberCount(): number {
    return this.summaryTeamMembers.length;
  }

  get completedMilestonesCount(): number {
    return (this.project.milestones ?? []).filter(m => m.status === MilestoneStatus.Completed).length;
  }

  get milestonesPaidLabel(): string {
    const total = this.project.milestones?.length ?? 0;
    if (!total) {
      return '—';
    }
    return `${this.completedMilestonesCount} of ${total}`;
  }

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

  showAssignmentCost(): boolean {
    return false;
  }

  isSelf(assignment: ProjectAssignmentDto): boolean {
    return this.highlightMemberId != null && assignment.teamMemberId === this.highlightMemberId;
  }

  openTeamSummaryModal(): void {
    const modalRef = this.modalService.open(ProjectTeamSummaryModalComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    modalRef.componentInstance.projectName = this.project.name;
    modalRef.componentInstance.members = this.summaryTeamMembers;
    modalRef.componentInstance.highlightMemberId = this.highlightMemberId;
    modalRef.componentInstance.manageHint = this.isClient
      ? 'Members assigned to deliver your project.'
      : 'Your colleagues on this project.';
    modalRef.componentInstance.profileSource = this.isClient ? 'client' : undefined;
    modalRef.componentInstance.allowMemberProfile = this.isClient;
  }

  openPaymentModal(): void {
    const modalRef = this.modalService.open(ProjectPaymentModalComponent, {
      centered: true,
      size: 'xl',
      scrollable: true,
    });
    modalRef.componentInstance.project = this.project;
    modalRef.componentInstance.editable = false;
  }

  onLogTimeClick(): void {
    this.logTimeClick.emit();
  }

  private refreshSkillCatalog(): void {
    const ids = this.project.requiredSkillIds ?? [];
    if (!ids.length) {
      this.skillCatalogById.clear();
      this.rebuildView();
      return;
    }

    forkJoin(
      ids.map(id =>
        this.skillsService.getById(id).pipe(catchError(() => of({ data: null as SkillDto | null })))
      )
    ).subscribe(results => {
      this.skillCatalogById.clear();
      results.forEach(res => {
        const skill = res.data;
        if (skill && skill.isActive !== false) {
          this.skillCatalogById.set(skill.id, skill);
        }
      });
      this.rebuildView();
    });
  }

  private rebuildView(): void {
    this.selectedSkillsForDisplay = (this.project.requiredSkillIds ?? [])
      .map(id => this.skillCatalogById.get(id))
      .filter((s): s is SkillDto => !!s);
    this.skillSlots = buildProjectSkillSlots(this.project, this.skillCatalogById);
  }
}
