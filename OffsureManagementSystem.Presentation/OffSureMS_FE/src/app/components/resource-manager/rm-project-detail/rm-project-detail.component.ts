import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  ProjectAssignmentDto,
  ProjectDto,
  ProjectStatus,
} from 'app/core/models/projects/project.models';
import { SkillDto } from 'app/core/models/skills/skill.models';
import { BreadcrumbService } from 'app/core/services/breadcrumb.service';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import { SkillsService } from 'app/core/services/skills.service';
import { AuthService } from 'app/core/services/auth.service';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { normalizeProjectStatus, projectStatusKey } from 'app/core/utils/enum-status.util';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import { assignmentsForSkill, displayRole } from 'app/core/utils/project-skill.util';
import { ProjectMilestonesReadonlyComponent } from 'app/shared/components/project-milestones-readonly/project-milestones-readonly.component';
import { PROJECT_STATUS_BADGES } from '../../admin/admin.constants';
import { RmAssignSkillModalComponent } from './rm-assign-skill-modal.component';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface RmProjectSkillSlot {
  skill: SkillDto;
  assignments: ProjectAssignmentDto[];
  pending: boolean;
}

@Component({
  selector: 'app-rm-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule, NgbNavModule, ProjectMilestonesReadonlyComponent],
  templateUrl: './rm-project-detail.component.html',
  styleUrl: '../../admin/admin-project-detail/admin-project-detail.component.scss',
})
export class RmProjectDetailComponent implements OnInit, OnDestroy {
  project: ProjectDto | null = null;
  loading = true;
  savingDelivery = false;
  progressPreview = 0;

  skillSlots: RmProjectSkillSlot[] = [];
  deliveryForm!: FormGroup;
  skillCatalogById = new Map<number, SkillDto>();
  expandedSkillIds = new Set<number>();
  activeTab: 'overview' | 'milestones' | 'staffing' = 'overview';

  readonly trackMembersPreview = 5;

  readonly statusOptions: { value: ProjectStatus; label: string }[] = [
    { value: ProjectStatus.Pending, label: 'Pending' },
    { value: ProjectStatus.InProgress, label: 'In Progress' },
    { value: ProjectStatus.OnHold, label: 'On Hold' },
    { value: ProjectStatus.Completed, label: 'Completed' },
    { value: ProjectStatus.Cancelled, label: 'Cancelled' },
  ];

  private projectId = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private portal: ResourceManagerPortalService,
    private skillsService: SkillsService,
    private modalService: NgbModal,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.deliveryForm = this.fb.group({
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      status: [ProjectStatus.InProgress, Validators.required],
    });

    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.projectId) {
      this.loading = false;
      return;
    }

    this.loadProject();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get progressControl(): FormControl<number> {
    return this.deliveryForm.get('progress') as FormControl<number>;
  }

  get isDeliveryLocked(): boolean {
    if (!this.project) return true;
    const status = normalizeProjectStatus(this.project.status);
    return status === ProjectStatus.Completed || status === ProjectStatus.Cancelled;
  }

  get hasRequiredSkills(): boolean {
    return (this.project?.requiredSkillIds?.length ?? 0) > 0;
  }

  get usesMilestones(): boolean {
    return !!this.project?.usesMilestones && !isHourlyBudgetProject(this.project);
  }

  get revenue(): number {
    return this.project?.budget ?? 0;
  }

  get milestoneCountLabel(): string | null {
    if (!this.usesMilestones) {
      return null;
    }
    const defined = this.project?.milestones?.length ?? 0;
    const max = this.project?.milestoneCount ?? 0;
    return max > 0 ? `${defined}/${max}` : null;
  }

  get selectedSkillsForDisplay(): SkillDto[] {
    return (this.project?.requiredSkillIds ?? [])
      .map(id => this.skillCatalogById.get(id))
      .filter((s): s is SkillDto => !!s);
  }

  get pendingSkillNames(): string {
    return this.skillSlots
      .filter(s => s.pending)
      .map(s => s.skill.name)
      .join(', ');
  }

  statusBadgeClass(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.text ?? String(status ?? '');
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

  canManageAssignment(assignment: ProjectAssignmentDto): boolean {
    const userId = this.auth.getCurrentUser()?.id;
    return userId != null && assignment.resourceManagerId === userId;
  }

  visibleAssignments(slot: RmProjectSkillSlot): ProjectAssignmentDto[] {
    const assignments = slot.assignments;
    if (assignments.length <= this.trackMembersPreview || this.expandedSkillIds.has(slot.skill.id)) {
      return assignments;
    }
    return assignments.slice(0, this.trackMembersPreview);
  }

  hiddenAssignmentCount(slot: RmProjectSkillSlot): number {
    return Math.max(0, slot.assignments.length - this.trackMembersPreview);
  }

  isSkillMembersExpanded(skillId: number): boolean {
    return this.expandedSkillIds.has(skillId);
  }

  toggleSkillMembersExpanded(skillId: number): void {
    if (this.expandedSkillIds.has(skillId)) {
      this.expandedSkillIds.delete(skillId);
    } else {
      this.expandedSkillIds.add(skillId);
    }
  }

  removeAssignment(assignment: ProjectAssignmentDto): void {
    if (!this.project || this.isDeliveryLocked || !this.canManageAssignment(assignment)) return;

    this.portal.removeAssignment(this.project.id, assignment.id).subscribe({
      next: res => {
        this.project = res.data ?? this.project;
        this.buildSkillSlots();
        this.patchDeliveryForm();
        this.toastr.success('Team member unassigned.');
      },
      error: err => this.toastr.error(err?.error?.message || 'Failed to unassign team member.'),
    });
  }

  openAssignModal(slot: RmProjectSkillSlot): void {
    if (!this.project || this.isDeliveryLocked) return;

    const modalRef = this.modalService.open(RmAssignSkillModalComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    modalRef.componentInstance.projectId = this.project.id;
    modalRef.componentInstance.project = this.project;
    modalRef.componentInstance.skill = slot.skill;
    modalRef.componentInstance.excludedMemberIds = slot.assignments.map(a => a.teamMemberId);

    modalRef.closed.subscribe(project => {
      if (project) {
        this.project = project;
        this.buildSkillSlots();
        this.patchDeliveryForm();
      }
    });
  }

  onProgressSliderInput(event: Event): void {
    this.setProgressLive((event.target as HTMLInputElement).valueAsNumber);
  }

  saveDelivery(): void {
    if (!this.project || this.deliveryForm.invalid || this.isDeliveryLocked) {
      this.deliveryForm.markAllAsTouched();
      return;
    }

    const progress = this.progressPreview;
    const status = this.deliveryForm.get('status')?.value as ProjectStatus;

    this.savingDelivery = true;
    this.portal.updateDelivery(this.project.id, { progress, status }).subscribe({
      next: res => {
        this.project = res.data ?? this.project;
        this.patchDeliveryForm();
        this.buildSkillSlots();
        this.toastr.success('Delivery updated.');
        this.savingDelivery = false;
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to update delivery.');
        this.savingDelivery = false;
      },
    });
  }

  private applyInitialTab(): void {
    this.activeTab = this.usesMilestones ? 'milestones' : 'overview';
  }

  private loadProject(): void {
    this.loading = true;
    this.portal.getProjectById(this.projectId).subscribe({
      next: res => {
        this.project = res.data ?? null;
        if (this.project?.name) {
          this.breadcrumbService.setDynamicLabel(this.project.name);
        }
        this.ensureRequiredSkillsInCatalog();
        this.buildSkillSlots();
        this.patchDeliveryForm();
        this.applyInitialTab();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private ensureRequiredSkillsInCatalog(): void {
    const ids = this.project?.requiredSkillIds ?? [];
    const missing = ids.filter(id => !this.skillCatalogById.has(id));
    if (!missing.length) {
      this.buildSkillSlots();
      return;
    }

    forkJoin(
      missing.map(id =>
        this.skillsService.getById(id).pipe(takeUntil(this.destroy$))
      )
    ).subscribe(results => {
      results.forEach(res => {
        if (res.data) {
          this.skillCatalogById.set(res.data.id, res.data);
        }
      });
      this.buildSkillSlots();
    });
  }

  private buildSkillSlots(): void {
    if (!this.project) {
      this.skillSlots = [];
      return;
    }

    const ids = this.project.requiredSkillIds ?? [];
    this.skillSlots = ids
      .map(id => this.skillCatalogById.get(id))
      .filter((s): s is SkillDto => !!s)
      .map(skill => {
        const assignments = assignmentsForSkill(this.project!.teamMembers, skill.id);
        return { skill, assignments, pending: assignments.length === 0 };
      });
  }

  private patchDeliveryForm(): void {
    if (!this.project) return;
    const progress = this.project.progress ?? 0;
    this.deliveryForm.patchValue({
      progress,
      status: normalizeProjectStatus(this.project.status),
    });
    this.progressPreview = this.clampProgress(progress);
  }

  private setProgressLive(value: unknown): void {
    const clamped = this.clampProgress(value);
    this.progressPreview = clamped;
    if (this.progressControl.value !== clamped) {
      this.progressControl.setValue(clamped, { emitEvent: false });
    }
  }

  private clampProgress(value: unknown): number {
    const n = Number(value);
    if (Number.isNaN(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n)));
  }
}
