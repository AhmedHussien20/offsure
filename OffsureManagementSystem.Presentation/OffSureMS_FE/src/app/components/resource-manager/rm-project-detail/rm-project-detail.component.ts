import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  MilestoneStatus,
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
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { normalizeProjectStatus, projectStatusKey } from 'app/core/utils/enum-status.util';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import { assignmentsForSkill, displayRole, directProjectAssignments, summaryProjectAssignments } from 'app/core/utils/project-skill.util';
import { isNearScrollEnd } from 'app/core/utils/scroll-pagination.util';
import { ProjectMilestonesReadonlyComponent } from 'app/shared/components/project-milestones-readonly/project-milestones-readonly.component';
import { PROJECT_STATUS_BADGES } from '../../admin/admin.constants';
import { RmAssignSkillModalComponent } from './rm-assign-skill-modal.component';
import { ProjectTeamSummaryModalComponent } from 'app/shared/components/project-team-summary-modal/project-team-summary-modal.component';
import { AdminHourlyProjectPanelComponent } from '../../admin/admin-project-detail/admin-hourly-project-panel.component';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

const SKILLS_PAGE_SIZE = 10;
const SKILLS_SEARCH_DEBOUNCE_MS = 300;
const SKILLS_SAVE_DEBOUNCE_MS = 450;

export interface RmProjectSkillSlot {
  skill: SkillDto;
  assignments: ProjectAssignmentDto[];
  pending: boolean;
}

@Component({
  selector: 'app-rm-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule, FormsModule, ProjectMilestonesReadonlyComponent, AdminHourlyProjectPanelComponent],
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
  assignBySkill = true;
  pendingAssignmentMode: boolean | null = null;
  directMembersExpanded = false;
  savingStaffingMode = false;
  savingSkills = false;
  savingHourlyCostRate = false;
  hourlyCostRateInput = '';
  skillSearchQuery = '';
  skillsList: SkillDto[] = [];
  skillsPageIndex = 1;
  skillsHasMore = true;
  skillsLoading = false;
  selectedSkillIds = new Set<number>();
  private skillsCatalogLoaded = false;

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
  private readonly skillSearch$ = new Subject<string>();
  private skillsSaveTimer: ReturnType<typeof setTimeout> | null = null;

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

    this.skillSearch$.pipe(debounceTime(SKILLS_SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$)).subscribe(() => {
      this.loadSkillsPage(false);
    });

    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.projectId) {
      this.loading = false;
      return;
    }

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

  get usesMilestones(): boolean {
    return !!this.project?.usesMilestones && !isHourlyBudgetProject(this.project);
  }

  get isHourlyBudget(): boolean {
    return isHourlyBudgetProject(this.project);
  }

  get hasHourlyCostRate(): boolean {
    return (this.project?.myHourlyCostRate ?? 0) > 0;
  }

  get canAssignTeam(): boolean {
    return !this.isHourlyBudget || this.hasHourlyCostRate;
  }

  get progressPercent(): number {
    return Math.min(100, Math.max(0, this.project?.progress ?? 0));
  }

  get teamMemberCount(): number {
    return this.project?.teamMembers?.length ?? 0;
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

  get selectedSkillsForDisplay(): SkillDto[] {
    return [...this.selectedSkillIds]
      .sort((a, b) => a - b)
      .map(id => this.skillCatalogById.get(id))
      .filter((s): s is SkillDto => !!s);
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

  get projectAssignments(): ProjectAssignmentDto[] {
    return summaryProjectAssignments(this.project?.teamMembers, this.assignBySkill);
  }

  get unassignedDirectMembers(): ProjectAssignmentDto[] {
    return directProjectAssignments(this.project?.teamMembers);
  }

  get sidebarTeamMembers(): ProjectAssignmentDto[] {
    return summaryProjectAssignments(this.project?.teamMembers, this.assignBySkill);
  }

  get visibleDirectAssignments(): ProjectAssignmentDto[] {
    const assignments = this.projectAssignments;
    if (assignments.length <= this.trackMembersPreview || this.directMembersExpanded) {
      return assignments;
    }
    return assignments.slice(0, this.trackMembersPreview);
  }

  get hiddenDirectAssignmentCount(): number {
    return Math.max(0, this.projectAssignments.length - this.trackMembersPreview);
  }

  get excludedDirectMemberIds(): number[] {
    return this.sidebarTeamMembers.map(a => a.teamMemberId);
  }

  get staffingSubtitle(): string {
    if (this.assignBySkill) {
      return 'Select required skills, then assign members from your team to each skill track.';
    }
    return 'Assign members directly from your team roster — no skill tracks needed.';
  }

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

  get totalAssignedCount(): number {
    return this.projectAssignments.length;
  }

  get staffedSkillCount(): number {
    return this.skillSlots.filter(s => s.assignments.length > 0).length;
  }

  get totalSkillCount(): number {
    return this.skillSlots.length;
  }

  get pendingSkillSlotCount(): number {
    return this.skillSlots.filter(s => s.pending).length;
  }

  get skillCoveragePercent(): number {
    if (!this.totalSkillCount) {
      return 0;
    }
    return Math.round((this.staffedSkillCount / this.totalSkillCount) * 100);
  }

  get staffingNeedsAttention(): boolean {
    if (this.isDeliveryLocked) {
      return false;
    }
    if (!this.assignBySkill) {
      return this.totalAssignedCount === 0;
    }
    return this.pendingSkillSlotCount > 0 || this.unassignedDirectMembers.length > 0;
  }

  get showStaffingGuide(): boolean {
    return this.staffingNeedsAttention && !this.isDeliveryLocked;
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

  openTeamSummaryModal(): void {
    if (!this.project) return;

    const modalRef = this.modalService.open(ProjectTeamSummaryModalComponent, {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    modalRef.componentInstance.projectName = this.project.name;
    modalRef.componentInstance.members = this.sidebarTeamMembers;
    modalRef.componentInstance.pendingSkillNames = this.pendingSkillNames;
    modalRef.componentInstance.manageHint = 'Use Team staffing below to add or remove your team members.';
    modalRef.componentInstance.profileSource = 'resource-manager';
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

  toggleDirectMembersExpanded(): void {
    this.directMembersExpanded = !this.directMembersExpanded;
  }

  onAssignBySkillChange(enabled: boolean): void {
    if (!this.project || this.isDeliveryLocked || this.savingStaffingMode) {
      return;
    }

    const previous = this.assignBySkill;
    this.assignBySkill = enabled;
    this.savingStaffingMode = true;

    this.portal.updateStaffingMode(this.project.id, { assignTeamBySkill: enabled }).subscribe({
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

  onMilestonesProjectChange(project: ProjectDto): void {
    this.project = project;
    this.patchDeliveryForm();
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
    if (!this.canAssignTeam) {
      this.toastr.warning('Set your cost rate on this project before assigning team members.');
      return;
    }

    this.openAssignMembersModal({
      assignBySkill: true,
      skill: slot.skill,
      excludedMemberIds: slot.assignments.map(a => a.teamMemberId),
    });
  }

  openDirectAssignModal(): void {
    if (!this.project || this.isDeliveryLocked) return;
    if (!this.canAssignTeam) {
      this.toastr.warning('Set your cost rate on this project before assigning team members.');
      return;
    }

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

    const modalRef = this.modalService.open(RmAssignSkillModalComponent, {
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

  saveHourlyCostRate(): void {
    if (!this.project || this.isDeliveryLocked || !this.isHourlyBudget) return;

    const rate = Number(this.hourlyCostRateInput);
    if (!Number.isFinite(rate) || rate <= 0) {
      this.toastr.warning('Enter a valid cost rate per hour.');
      return;
    }

    this.savingHourlyCostRate = true;
    this.portal.updateHourlyCostRate(this.project.id, { hourlyCostRate: rate }).subscribe({
      next: res => {
        this.project = res.data ?? this.project;
        this.syncHourlyCostRateInput();
        this.toastr.success('Cost rate saved.');
        this.savingHourlyCostRate = false;
      },
      error: err => {
        this.savingHourlyCostRate = false;
        this.toastr.error(err?.error?.message || 'Failed to save cost rate.');
      },
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

  private syncHourlyCostRateInput(): void {
    const rate = this.project?.myHourlyCostRate;
    this.hourlyCostRateInput = rate != null && rate > 0 ? String(rate) : '';
  }

  private loadProject(): void {
    this.loading = true;
    this.portal.getProjectById(this.projectId).subscribe({
      next: res => {
        this.project = res.data ?? null;
        if (this.project?.name) {
          this.breadcrumbService.setDynamicLabel(this.project.name);
        }
        this.syncSkillSelection();
        this.assignBySkill = this.project?.assignTeamBySkill ?? false;
        if (this.assignBySkill) {
          this.ensureSkillsCatalogLoaded();
          this.ensureRequiredSkillsInCatalog();
        } else {
          this.resetSkillsCatalog();
          this.buildSkillSlots();
        }
        this.patchDeliveryForm();
        this.syncHourlyCostRateInput();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
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
    this.portal.updateRequiredSkills(this.project.id, { requiredSkillIds: ids }).subscribe({
      next: res => {
        this.project = res.data ?? this.project;
        this.syncSkillSelection();
        this.assignBySkill = this.hasRequiredSkills ? (this.project?.assignTeamBySkill ?? this.assignBySkill) : false;
        this.ensureRequiredSkillsInCatalog();
        this.buildSkillSlots();
        this.savingSkills = false;
      },
      error: err => {
        this.savingSkills = false;
        this.toastr.error(err?.error?.message || 'Failed to update required skills.');
        this.syncSkillSelection();
        this.buildSkillSlots();
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

  private syncSkillSelection(): void {
    const ids = this.project?.requiredSkillIds ?? [];
    this.selectedSkillIds = new Set(ids);
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

    const ids = [...this.selectedSkillIds].sort((a, b) => a - b);
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
