import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  ProjectAssignmentDto,
  ProjectDto,
  ProjectStatus,
} from 'app/core/models/projects/project.models';
import { SkillDto } from 'app/core/models/skills/skill.models';
import { ServiceRequestStatus } from 'app/core/models/services/service.models';
import { BreadcrumbService } from 'app/core/services/breadcrumb.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { SkillsService } from 'app/core/services/skills.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { ResourceManagerUserDto } from 'app/core/models/team-members/team-member.models';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { normalizeProjectStatus, projectStatusKey } from 'app/core/utils/enum-status.util';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import {
  assignmentsForSkill,
  assignmentCostIssue,
  assignmentCostIsComplete,
  assignmentLineCost,
  computeProjectFinancials,
  displayRole,
  ProjectFinancials,
  directProjectAssignments,
  summaryProjectAssignments,
} from 'app/core/utils/project-skill.util';
import { MilestoneStatus } from 'app/core/models/projects/project.models';
import { isNearScrollEnd } from 'app/core/utils/scroll-pagination.util';
import { PROJECT_STATUS_BADGES } from '../admin.constants';
import { AdminAssignSkillModalComponent } from './admin-assign-skill-modal.component';
import { AdminProjectMilestonesComponent } from './admin-project-milestones.component';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

export interface ProjectSkillSlot {
  skill: SkillDto;
  assignments: ProjectAssignmentDto[];
  pending: boolean;
}

const SKILLS_PAGE_SIZE = 10;
const SKILLS_SEARCH_DEBOUNCE_MS = 300;
const SKILLS_SAVE_DEBOUNCE_MS = 450;
const RM_PAGE_SIZE = 10;
const RM_SEARCH_DEBOUNCE_MS = 300;
const MAX_PROJECT_RESOURCE_MANAGERS = 2;

@Component({
  selector: 'app-admin-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule, FormsModule, AdminProjectMilestonesComponent],
  templateUrl: './admin-project-detail.component.html',
  styleUrl: './admin-project-detail.component.scss',
})
export class AdminProjectDetailComponent implements OnInit, OnDestroy {
  project: ProjectDto | null = null;
  loading = true;
  savingProgress = false;
  savingStatus = false;
  savingSkills = false;
  savingStaffingMode = false;
  progressPreview = 0;

  assignBySkill = true;
  pendingAssignmentMode: boolean | null = null;
  skillSearchQuery = '';
  skillsList: SkillDto[] = [];
  skillsPageIndex = 1;
  skillsHasMore = true;
  skillsLoading = false;
  skillCatalogById = new Map<number, SkillDto>();

  selectedSkillIds = new Set<number>();
  skillSlots: ProjectSkillSlot[] = [];
  deliveryForm!: FormGroup;

  resourceManagersList: ResourceManagerUserDto[] = [];
  selectedResourceManagerIds = new Set<number>();
  savingResourceManagers = false;
  resourceManagersLoading = false;
  resourceManagersPageIndex = 1;
  resourceManagersHasMore = true;
  resourceManagersTotalCount = 0;
  resourceManagerSearchQuery = '';
  resourceManagersCatalogById = new Map<number, ResourceManagerUserDto>();
  expandedSkillIds = new Set<number>();
  directMembersExpanded = false;
  milestoneAutoEdit = false;

  readonly trackMembersPreview = 5;
  readonly maxResourceManagers = MAX_PROJECT_RESOURCE_MANAGERS;

  readonly statusOptions: { value: ProjectStatus; label: string }[] = [
    { value: ProjectStatus.Pending, label: 'Pending' },
    { value: ProjectStatus.InProgress, label: 'In Progress' },
    { value: ProjectStatus.OnHold, label: 'On Hold' },
    { value: ProjectStatus.Completed, label: 'Completed' },
    { value: ProjectStatus.Cancelled, label: 'Cancelled' },
  ];

  private projectId = 0;
  private readonly destroy$ = new Subject<void>();
  private readonly skillSearch$ = new Subject<string>();
  private readonly resourceManagerSearch$ = new Subject<string>();
  private skillsSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private skillsCatalogLoaded = false;

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private serviceRequestsService: ServiceRequestsService,
    private skillsService: SkillsService,
    private teamMembersService: TeamMembersService,
    private modalService: NgbModal,
    private confirmDialog: ConfirmDialogService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.deliveryForm = this.fb.group({
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      status: [ProjectStatus.InProgress, Validators.required],
    });

    this.skillSearch$.pipe(debounceTime(SKILLS_SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$)).subscribe(() => {
      this.loadSkillsPage(false);
    });

    this.resourceManagerSearch$
      .pipe(debounceTime(RM_SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadResourceManagersPage(false);
      });

    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.projectId) {
      this.loading = false;
      return;
    }

    this.loadResourceManagersPage(false);
    this.loadProject();
  }

  ngOnDestroy(): void {
    if (this.skillsSaveTimer) {
      clearTimeout(this.skillsSaveTimer);
    }
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
    return this.selectedSkillIds.size > 0;
  }

  get isHourlyBudget(): boolean {
    return isHourlyBudgetProject(this.project);
  }

  get usesMilestones(): boolean {
    return !!this.project?.usesMilestones && !this.isHourlyBudget;
  }

  get revenue(): number {
    return this.project?.budget ?? 0;
  }

  get costSummary(): ProjectFinancials {
    return computeProjectFinancials(this.project?.budget, this.project?.teamMembers);
  }

  get selectedSkillsForDisplay(): SkillDto[] {
    return [...this.selectedSkillIds]
      .map(id => this.skillCatalogById.get(id))
      .filter((s): s is SkillDto => !!s);
  }

  get selectedResourceManagersForDisplay(): ResourceManagerUserDto[] {
    return [...this.selectedResourceManagerIds]
      .map(id => this.resourceManagersCatalogById.get(id))
      .filter((rm): rm is ResourceManagerUserDto => !!rm);
  }

  get pendingSkillNames(): string {
    if (!this.assignBySkill) {
      return '';
    }
    return this.skillSlots
      .filter(s => s.pending)
      .map(s => s.skill.name)
      .join(', ');
  }

  get usesSkillStaffing(): boolean {
    return this.assignBySkill;
  }

  get staffingSubtitle(): string {
    if (this.assignBySkill) {
      return 'Choose assignment mode, define skills, assign resource managers, then staff the project.';
    }
    return 'Assign team members directly from the full roster — no skill tracks.';
  }

  get summaryTeamMembers(): ProjectAssignmentDto[] {
    return summaryProjectAssignments(this.project?.teamMembers, this.usesSkillStaffing);
  }

  get excludedDirectMemberIds(): number[] {
    return this.summaryTeamMembers.map(a => a.teamMemberId);
  }

  get visibleDirectAssignments(): ProjectAssignmentDto[] {
    const assignments = this.summaryTeamMembers;
    if (assignments.length <= this.trackMembersPreview || this.directMembersExpanded) {
      return assignments;
    }
    return assignments.slice(0, this.trackMembersPreview);
  }

  get hiddenDirectAssignmentCount(): number {
    return Math.max(0, this.summaryTeamMembers.length - this.trackMembersPreview);
  }

  get unassignedDirectMembers(): ProjectAssignmentDto[] {
    return directProjectAssignments(this.project?.teamMembers);
  }

  get milestoneCountLabel(): string | null {
    if (!this.project?.usesMilestones) {
      return null;
    }
    const defined = this.project.milestones?.length ?? 0;
    const max = this.project.milestoneCount ?? 0;
    return max > 0 ? `${defined}/${max}` : null;
  }

  get completedMilestonesCount(): number {
    return (this.project?.milestones ?? []).filter(m => m.status === MilestoneStatus.Completed).length;
  }

  get milestonesPaidLabel(): string {
    const total = this.project?.milestones?.length ?? 0;
    if (!total) {
      return '—';
    }
    return `${this.completedMilestonesCount} of ${total}`;
  }

  get progressPercent(): number {
    return Math.min(100, Math.max(0, this.project?.progress ?? 0));
  }

  get budgetTypeLabel(): string {
    return this.isHourlyBudget ? 'Hourly' : 'Fixed total';
  }

  get canAddResourceManager(): boolean {
    return this.selectedResourceManagerIds.size < this.maxResourceManagers;
  }

  get teamMemberCount(): number {
    return this.summaryTeamMembers.length;
  }

  isResourceManagerDisabled(rmId: number): boolean {
    return !this.isResourceManagerSelected(rmId) && !this.canAddResourceManager;
  }

  get incompleteCostAssignments(): ProjectAssignmentDto[] {
    if (!this.isHourlyBudget) {
      return [];
    }
    return (this.project?.teamMembers ?? []).filter(a => !assignmentCostIsComplete(a));
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

  onProjectUpdated(project: ProjectDto): void {
    this.project = project;
    this.buildSkillSlots();
    this.patchDeliveryForm();
  }

  lineCost(assignment: ProjectAssignmentDto): number {
    return assignmentLineCost(assignment);
  }

  readonly isAssignmentCostComplete = assignmentCostIsComplete;
  readonly assignmentCostIssueLabel = assignmentCostIssue;

  isSkillSelected(skillId: number): boolean {
    return this.selectedSkillIds.has(skillId);
  }

  onSkillSearchInput(value: string): void {
    this.skillSearchQuery = value;
    this.skillSearch$.next(value);
  }

  onSkillPickerScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!isNearScrollEnd(el) || this.skillsLoading || !this.skillsHasMore) {
      return;
    }
    this.loadSkillsPage(true);
  }

  toggleSkill(skill: SkillDto): void {
    if (this.isDeliveryLocked || !this.assignBySkill) return;

    this.skillCatalogById.set(skill.id, skill);
    if (this.selectedSkillIds.has(skill.id)) {
      this.selectedSkillIds.delete(skill.id);
    } else {
      this.selectedSkillIds.add(skill.id);
    }
    this.buildSkillSlots();
    this.scheduleSaveRequiredSkills();
  }

  isResourceManagerSelected(userId: number): boolean {
    return this.selectedResourceManagerIds.has(userId);
  }

  onResourceManagerSearchInput(value: string): void {
    this.resourceManagerSearchQuery = value;
    this.resourceManagerSearch$.next(value);
  }

  onResourceManagerPickerScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!isNearScrollEnd(el) || this.resourceManagersLoading || !this.resourceManagersHasMore) {
      return;
    }
    this.loadResourceManagersPage(true);
  }

  visibleAssignments(slot: ProjectSkillSlot): ProjectAssignmentDto[] {
    const assignments = slot.assignments;
    if (assignments.length <= this.trackMembersPreview || this.expandedSkillIds.has(slot.skill.id)) {
      return assignments;
    }
    return assignments.slice(0, this.trackMembersPreview);
  }

  hiddenAssignmentCount(slot: ProjectSkillSlot): number {
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

  toggleDirectMembersExpanded(): void {
    this.directMembersExpanded = !this.directMembersExpanded;
  }

  selectAssignmentMode(bySkill: boolean): void {
    if (this.isDeliveryLocked || this.savingStaffingMode) {
      return;
    }

    if (this.assignBySkill === bySkill) {
      this.pendingAssignmentMode = null;
      return;
    }

    if (this.pendingAssignmentMode === bySkill) {
      this.pendingAssignmentMode = null;
      this.onAssignBySkillChange(bySkill);
      return;
    }

    this.pendingAssignmentMode = bySkill;
  }

  onAssignBySkillChange(enabled: boolean): void {
    if (!this.project || this.isDeliveryLocked || this.savingStaffingMode) {
      return;
    }

    const previous = this.assignBySkill;
    this.assignBySkill = enabled;
    this.savingStaffingMode = true;

    this.projectsService
      .update(this.project.id, {
        name: this.project.name,
        description: this.project.description,
        targetEndDate: this.project.targetEndDate ?? undefined,
        budget: this.project.budget ?? undefined,
        progress: this.project.progress ?? undefined,
        assignTeamBySkill: enabled,
      })
      .subscribe({
        next: res => {
          this.project = res.data ?? this.project;
          this.assignBySkill = this.project?.assignTeamBySkill ?? enabled;
          if (this.assignBySkill) {
            this.ensureSkillsCatalogLoaded();
            this.ensureRequiredSkillsInCatalog();
          } else {
            this.resetSkillsCatalog();
          }
          this.buildSkillSlots();
          this.pendingAssignmentMode = null;
          this.savingStaffingMode = false;
          this.toastr.success('Assignment mode saved.');
        },
        error: err => {
          this.assignBySkill = previous;
          this.pendingAssignmentMode = null;
          this.savingStaffingMode = false;
          this.toastr.error(err?.error?.message || 'Failed to save assignment mode.');
        },
      });
  }

  private ensureSkillsCatalogLoaded(): void {
    if (!this.assignBySkill || this.skillsCatalogLoaded) {
      return;
    }
    this.skillsCatalogLoaded = true;
    this.loadSkillsPage(false);
  }

  private resetSkillsCatalog(): void {
    this.skillsCatalogLoaded = false;
    this.skillsList = [];
    this.skillsPageIndex = 1;
    this.skillsHasMore = true;
    this.skillSearchQuery = '';
  }

  toggleResourceManager(manager: ResourceManagerUserDto): void {
    if (this.isDeliveryLocked || !this.project) return;

    this.resourceManagersCatalogById.set(manager.id, manager);
    if (this.selectedResourceManagerIds.has(manager.id)) {
      this.selectedResourceManagerIds.delete(manager.id);
    } else {
      if (!this.canAddResourceManager) {
        this.toastr.warning(`A project can have at most ${this.maxResourceManagers} resource managers.`);
        return;
      }
      this.selectedResourceManagerIds.add(manager.id);
    }
    this.saveResourceManagers();
  }

  skillSlotCost(slot: ProjectSkillSlot): number {
    return slot.assignments.reduce((sum, a) => sum + assignmentLineCost(a), 0);
  }

  slotHasIncompleteCost(slot: ProjectSkillSlot): boolean {
    return slot.assignments.some(a => !assignmentCostIsComplete(a));
  }

  openAssignModal(slot: ProjectSkillSlot): void {
    if (!this.project || this.isDeliveryLocked) return;

    this.openAssignMembersModal({
      assignBySkill: true,
      skill: slot.skill,
      excludedMemberIds: slot.assignments.map(a => a.teamMemberId),
    });
  }

  openDirectAssignModal(): void {
    if (!this.project || this.isDeliveryLocked) return;

    this.openAssignMembersModal({
      assignBySkill: false,
      skill: null,
      excludedMemberIds: this.excludedDirectMemberIds,
    });
  }

  private openAssignMembersModal(options: {
    assignBySkill: boolean;
    skill: SkillDto | null;
    excludedMemberIds: number[];
  }): void {
    if (!this.project) return;

    const modalRef = this.modalService.open(AdminAssignSkillModalComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    modalRef.componentInstance.projectId = this.project.id;
    modalRef.componentInstance.project = this.project;
    modalRef.componentInstance.assignBySkill = options.assignBySkill;
    modalRef.componentInstance.skill = options.skill;
    modalRef.componentInstance.excludedMemberIds = options.excludedMemberIds;

    modalRef.closed.subscribe(project => {
      if (project) {
        this.project = project;
        this.buildSkillSlots();
        this.patchDeliveryForm();
      }
    });
  }

  removeAssignment(assignment: ProjectAssignmentDto): void {
    if (!this.project || this.isDeliveryLocked) return;

    this.projectsService.removeAssignment(this.project.id, assignment.id).subscribe({
      next: res => {
        this.project = res.data ?? this.project;
        this.buildSkillSlots();
        this.toastr.success('Team member unassigned.');
      },
      error: err => this.toastr.error(err?.error?.message || 'Failed to unassign team member.'),
    });
  }

  async markComplete(): Promise<void> {
    if (!this.project || this.isDeliveryLocked) return;
    const ok = await this.promptAndCompleteProject();
    if (!ok) {
      this.patchDeliveryForm();
    }
  }

  onProgressSliderInput(event: Event): void {
    this.setProgressLive((event.target as HTMLInputElement).valueAsNumber);
  }

  saveProgress(): void {
    if (!this.project || this.deliveryForm.get('progress')?.invalid) return;

    const progress = this.progressPreview;
    this.savingProgress = true;
    this.projectsService
      .update(this.project.id, {
        name: this.project.name,
        description: this.project.description,
        targetEndDate: this.project.targetEndDate ?? undefined,
        budget: this.project.budget ?? undefined,
        progress,
      })
      .subscribe({
        next: res => {
          this.project = res.data ?? this.project;
          this.patchDeliveryForm();
          this.toastr.success('Progress updated.');
          this.savingProgress = false;
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update progress.');
          this.savingProgress = false;
        },
      });
  }

  async saveStatus(): Promise<void> {
    if (!this.project || this.deliveryForm.get('status')?.invalid) return;

    const status = this.deliveryForm.get('status')?.value as ProjectStatus;
    const current = normalizeProjectStatus(this.project.status);

    if (status === ProjectStatus.Completed && current !== ProjectStatus.Completed) {
      const ok = await this.promptAndCompleteProject();
      if (!ok) {
        this.patchDeliveryForm();
      }
      return;
    }

    this.savingStatus = true;
    this.projectsService.updateStatus(this.project.id, { status }).subscribe({
      next: res => {
        this.project = res.data ?? this.project;
        this.patchDeliveryForm();
        this.buildSkillSlots();
        this.toastr.success('Project status updated.');
        this.savingStatus = false;
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to update status.');
        this.savingStatus = false;
      },
    });
  }

  private async promptAndCompleteProject(): Promise<boolean> {
    if (!this.project || this.isDeliveryLocked) return false;

    let completeLinkedRequest = false;

    if (this.project.serviceRequestId > 0) {
      const choice = await this.confirmDialog.confirmChoice({
        title: 'Complete project',
        message: `Mark "${this.project.name}" as completed. Do you also want to mark the linked service request as Completed?`,
        confirmLabel: 'Project & request',
        alternateConfirmLabel: 'Project only',
        cancelLabel: 'Cancel',
        variant: 'primary',
        icon: 'ti-check',
      });

      if (!choice) {
        return false;
      }

      completeLinkedRequest = choice === 'confirm';
    } else {
      const confirmed = await this.confirmDialog.confirm({
        title: 'Complete project',
        message: `Mark "${this.project.name}" as completed?`,
        confirmLabel: 'Complete',
        variant: 'primary',
        icon: 'ti-check',
      });
      if (!confirmed) {
        return false;
      }
    }

    return this.finalizeProjectCompleted(completeLinkedRequest);
  }

  private finalizeProjectCompleted(completeLinkedRequest: boolean): Promise<boolean> {
    if (!this.project) {
      return Promise.resolve(false);
    }

    this.savingStatus = true;

    return new Promise(resolve => {
      this.projectsService.updateStatus(this.project!.id, { status: ProjectStatus.Completed }).subscribe({
        next: res => {
          this.project = res.data ?? this.project;
          this.patchDeliveryForm();
          this.buildSkillSlots();

          if (completeLinkedRequest && this.project?.serviceRequestId) {
            this.serviceRequestsService
              .updateStatus(this.project.serviceRequestId, { status: ServiceRequestStatus.Completed })
              .subscribe({
                next: () => {
                  this.toastr.success('Project and linked request marked complete.');
                  this.savingStatus = false;
                  resolve(true);
                },
                error: err => {
                  this.toastr.warning(
                    err?.error?.message || 'Project completed, but the linked request could not be updated.'
                  );
                  this.savingStatus = false;
                  resolve(true);
                },
              });
            return;
          }

          this.toastr.success('Project marked complete.');
          this.savingStatus = false;
          resolve(true);
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to complete project.');
          this.savingStatus = false;
          resolve(false);
        },
      });
    });
  }

  private scheduleSaveRequiredSkills(): void {
    if (this.skillsSaveTimer) {
      clearTimeout(this.skillsSaveTimer);
    }
    this.skillsSaveTimer = setTimeout(() => this.persistRequiredSkills(), SKILLS_SAVE_DEBOUNCE_MS);
  }

  private persistRequiredSkills(): void {
    if (!this.project || this.isDeliveryLocked || !this.assignBySkill) return;

    const ids = [...this.selectedSkillIds].sort((a, b) => a - b);
    this.savingSkills = true;
    this.projectsService
      .update(this.project.id, {
        name: this.project.name,
        description: this.project.description,
        targetEndDate: this.project.targetEndDate ?? undefined,
        budget: this.project.budget ?? undefined,
        progress: this.project.progress ?? undefined,
        requiredSkillIds: ids,
      })
      .subscribe({
        next: res => {
          this.project = res.data ?? this.project;
          this.syncSkillSelection();
          this.ensureRequiredSkillsInCatalog();
          this.buildSkillSlots();
          this.savingSkills = false;
        },
        error: err => {
          this.savingSkills = false;
          this.toastr.error(err?.error?.message || 'Failed to update required skills.');
        },
      });
  }

  private loadSkillsPage(append: boolean): void {
    if (!this.assignBySkill) return;
    if (this.skillsLoading) return;
    if (append && !this.skillsHasMore) return;

    const pageIndex = append ? this.skillsPageIndex + 1 : 1;
    this.skillsLoading = true;

    this.skillsService
      .getAll({
        pageIndex,
        pageSize: SKILLS_PAGE_SIZE,
        isActive: true,
        searchKey: this.skillSearchQuery.trim() || undefined,
      })
      .subscribe({
        next: res => {
          const paged = res.data;
          const batch = (paged?.data ?? []).filter(s => s.isActive);
          batch.forEach(s => this.skillCatalogById.set(s.id, s));

          if (append) {
            const existing = new Set(this.skillsList.map(s => s.id));
            this.skillsList = [...this.skillsList, ...batch.filter(s => !existing.has(s.id))];
          } else {
            this.skillsList = batch;
          }

          this.skillsPageIndex = pageIndex;
          const total = paged?.totalCount ?? 0;
          this.skillsHasMore = this.skillsList.length < total;
          this.skillsLoading = false;
        },
        error: () => {
          this.skillsLoading = false;
        },
      });
  }

  private ensureRequiredSkillsInCatalog(): void {
    const ids = this.project?.requiredSkillIds ?? [];
    const missing = ids.filter(id => !this.skillCatalogById.has(id));
    if (!missing.length) return;

    forkJoin(
      missing.map(id =>
        this.skillsService.getById(id).pipe(
          takeUntil(this.destroy$)
        )
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

  private syncSkillSelection(): void {
    const ids = this.project?.requiredSkillIds ?? [];
    this.selectedSkillIds = new Set(ids);
  }

  private syncResourceManagerSelection(): void {
    const ids = (this.project?.resourceManagers ?? []).map(rm => rm.userId);
    this.selectedResourceManagerIds = new Set(ids);
    this.syncResourceManagerCatalogFromProject();
  }

  private syncResourceManagerCatalogFromProject(): void {
    (this.project?.resourceManagers ?? []).forEach(rm => {
      this.resourceManagersCatalogById.set(rm.userId, {
        id: rm.userId,
        firstName: '',
        lastName: '',
        fullName: rm.fullName,
        email: rm.email,
      });
    });
  }

  private loadResourceManagersPage(append: boolean): void {
    if (this.resourceManagersLoading) return;
    if (append && !this.resourceManagersHasMore) return;

    const pageIndex = append ? this.resourceManagersPageIndex + 1 : 1;
    this.resourceManagersLoading = true;

    this.teamMembersService
      .getResourceManagers({
        pageIndex,
        pageSize: RM_PAGE_SIZE,
        searchKey: this.resourceManagerSearchQuery.trim() || undefined,
      })
      .subscribe({
        next: res => {
          const paged = res.data;
          const batch = paged?.data ?? [];
          batch.forEach(rm => this.resourceManagersCatalogById.set(rm.id, rm));

          if (append) {
            const existing = new Set(this.resourceManagersList.map(rm => rm.id));
            this.resourceManagersList = [
              ...this.resourceManagersList,
              ...batch.filter(rm => !existing.has(rm.id)),
            ];
          } else {
            this.resourceManagersList = batch;
          }

          this.resourceManagersPageIndex = pageIndex;
          this.resourceManagersTotalCount = paged?.totalCount ?? 0;
          this.resourceManagersHasMore = this.resourceManagersList.length < this.resourceManagersTotalCount;
          this.resourceManagersLoading = false;
        },
        error: () => {
          this.resourceManagersLoading = false;
          if (!append) {
            this.toastr.error('Failed to load resource managers.');
          }
        },
      });
  }

  private saveResourceManagers(): void {
    if (!this.project) return;

    this.savingResourceManagers = true;
    this.projectsService
      .setResourceManagers(this.project.id, [...this.selectedResourceManagerIds])
      .subscribe({
        next: res => {
          this.project = res.data ?? this.project;
          this.syncResourceManagerSelection();
          this.savingResourceManagers = false;
        },
        error: err => {
          this.savingResourceManagers = false;
          this.syncResourceManagerSelection();
          this.toastr.error(err?.error?.message || 'Failed to update resource managers.');
        },
      });
  }

  private buildSkillSlots(): void {
    if (!this.project) {
      this.skillSlots = [];
      return;
    }

    const ids = [...this.selectedSkillIds].sort((a, b) => a - b);
    this.skillSlots = ids
      .map(id => this.skillCatalogById.get(id))
      .filter((s): s is SkillDto => !!s)
      .map(skill => {
        const assignments = assignmentsForSkill(this.project!.teamMembers, skill.id);
        return { skill, assignments, pending: assignments.length === 0 };
      });
  }

  private loadProject(): void {
    this.loading = true;
    this.projectsService.getById(this.projectId).subscribe({
      next: res => {
        this.project = res.data ?? null;
        if (this.project?.name) {
          this.breadcrumbService.setDynamicLabel(this.project.name);
        }
        this.syncSkillSelection();
        this.syncResourceManagerSelection();
        this.assignBySkill = this.project?.assignTeamBySkill ?? false;
        if (this.assignBySkill) {
          this.ensureSkillsCatalogLoaded();
          this.ensureRequiredSkillsInCatalog();
        } else {
          this.resetSkillsCatalog();
          this.buildSkillSlots();
        }
        this.patchDeliveryForm();
        this.applyMilestoneAutoEdit();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private applyMilestoneAutoEdit(): void {
    if (this.route.snapshot.queryParamMap.get('tab') === 'milestones' && this.usesMilestones) {
      this.milestoneAutoEdit = true;
    }
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
