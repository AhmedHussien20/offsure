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
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { normalizeProjectStatus, projectStatusKey } from 'app/core/utils/enum-status.util';
import {
  assignmentsForSkill,
  assignmentLineCost,
  computeProjectFinancials,
  displayRole,
  ProjectFinancials,
} from 'app/core/utils/project-skill.util';
import { isNearScrollEnd } from 'app/core/utils/scroll-pagination.util';
import { PROJECT_STATUS_BADGES } from '../admin.constants';
import { AdminAssignSkillModalComponent } from './admin-assign-skill-modal.component';
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

@Component({
  selector: 'app-admin-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-project-detail.component.html',
  styleUrl: './admin-project-detail.component.scss',
})
export class AdminProjectDetailComponent implements OnInit, OnDestroy {
  project: ProjectDto | null = null;
  loading = true;
  savingProgress = false;
  savingStatus = false;
  savingSkills = false;
  progressPreview = 0;

  skillSearchQuery = '';
  skillsList: SkillDto[] = [];
  skillsPageIndex = 1;
  skillsHasMore = true;
  skillsLoading = false;
  skillCatalogById = new Map<number, SkillDto>();

  selectedSkillIds = new Set<number>();
  skillSlots: ProjectSkillSlot[] = [];
  financials: ProjectFinancials = computeProjectFinancials(0, []);
  deliveryForm!: FormGroup;

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
    private projectsService: ProjectsService,
    private serviceRequestsService: ServiceRequestsService,
    private skillsService: SkillsService,
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

    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.projectId) {
      this.loading = false;
      return;
    }

    this.loadSkillsPage(false);
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

  get selectedSkillsForDisplay(): SkillDto[] {
    return [...this.selectedSkillIds]
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

  lineCost(assignment: ProjectAssignmentDto): number {
    return assignmentLineCost(assignment);
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
    if (this.isDeliveryLocked) return;

    this.skillCatalogById.set(skill.id, skill);
    if (this.selectedSkillIds.has(skill.id)) {
      this.selectedSkillIds.delete(skill.id);
    } else {
      this.selectedSkillIds.add(skill.id);
    }
    this.buildSkillSlots();
    this.scheduleSaveRequiredSkills();
  }

  skillSlotCost(slot: ProjectSkillSlot): number {
    return slot.assignments.reduce((sum, a) => sum + assignmentLineCost(a), 0);
  }

  openAssignModal(slot: ProjectSkillSlot): void {
    if (!this.project || this.isDeliveryLocked) return;

    const modalRef = this.modalService.open(AdminAssignSkillModalComponent, {
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
    if (!this.project || this.isDeliveryLocked) return;

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

  private buildSkillSlots(): void {
    if (!this.project) {
      this.skillSlots = [];
      this.financials = computeProjectFinancials(0, []);
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

    this.financials = computeProjectFinancials(this.project.budget, this.project.teamMembers);
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
        this.ensureRequiredSkillsInCatalog();
        this.buildSkillSlots();
        this.patchDeliveryForm();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
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
