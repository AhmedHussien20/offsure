import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectDto, ProjectStatus } from 'app/core/models/projects/project.models';
import { ProjectsService } from 'app/core/services/projects.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { TeamMemberDto } from 'app/core/models/team-members/team-member.models';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { normalizeProjectStatus, projectStatusKey } from 'app/core/utils/enum-status.util';
import { PROJECT_STATUS_BADGES } from '../admin.constants';

@Component({
  selector: 'app-admin-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-project-detail.component.html',
  styleUrl: './admin-project-detail.component.scss',
})
export class AdminProjectDetailComponent implements OnInit {
  project: ProjectDto | null = null;
  loading = true;
  savingProgress = false;
  savingStatus = false;
  /** Live value while dragging the slider (synced with form + number input). */
  progressPreview = 0;
  teamMembers: TeamMemberDto[] = [];
  assignForm!: FormGroup;
  deliveryForm!: FormGroup;

  readonly statusOptions: { value: ProjectStatus; label: string }[] = [
    { value: ProjectStatus.Pending, label: 'Pending' },
    { value: ProjectStatus.InProgress, label: 'In Progress' },
    { value: ProjectStatus.OnHold, label: 'On Hold' },
    { value: ProjectStatus.Completed, label: 'Completed' },
    { value: ProjectStatus.Cancelled, label: 'Cancelled' },
  ];

  private projectId = 0;

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private teamMembersService: TeamMembersService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.assignForm = this.fb.group({
      teamMemberId: [null, Validators.required],
      role: ['', Validators.required],
    });

    this.deliveryForm = this.fb.group({
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      status: [ProjectStatus.InProgress, Validators.required],
    });

    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.projectId) {
      this.loading = false;
      return;
    }

    this.teamMembersService
      .getAll({ pageIndex: 1, pageSize: 200, isAvailable: true } as any)
      .subscribe(res => {
        this.teamMembers = res.data?.data ?? [];
      });

    this.loadProject();
  }

  get progressControl(): FormControl<number> {
    return this.deliveryForm.get('progress') as FormControl<number>;
  }

  onProgressSliderInput(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.setProgressLive(value);
  }

  onExactValueInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value === '') {
      return;
    }
    this.setProgressLive(input.value);
  }

  onExactValueBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value === '') {
      this.setProgressLive(0);
    }
  }

  get isDeliveryLocked(): boolean {
    if (!this.project) return true;
    const status = normalizeProjectStatus(this.project.status);
    return status === ProjectStatus.Completed || status === ProjectStatus.Cancelled;
  }

  statusBadgeClass(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.text ?? String(status ?? '');
  }

  saveProgress(): void {
    if (!this.project || this.deliveryForm.get('progress')?.invalid) {
      this.deliveryForm.get('progress')?.markAsTouched();
      return;
    }

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

  saveStatus(): void {
    if (!this.project || this.deliveryForm.get('status')?.invalid) {
      return;
    }

    const status = this.deliveryForm.get('status')?.value as ProjectStatus;
    if (normalizeProjectStatus(this.project.status) === normalizeProjectStatus(status)) {
      this.toastr.info('Status is already set to this value.');
      return;
    }

    this.savingStatus = true;
    this.projectsService.updateStatus(this.project.id, { status }).subscribe({
      next: res => {
        this.project = res.data ?? this.project;
        this.patchDeliveryForm();
        this.toastr.success('Project status updated.');
        if (normalizeProjectStatus(this.project?.status) === ProjectStatus.Completed) {
          this.toastr.info('You can now mark the related service request as Completed.');
        }
        this.savingStatus = false;
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to update status.');
        this.savingStatus = false;
      },
    });
  }

  assignMember(): void {
    if (this.isDeliveryLocked) {
      return;
    }

    if (!this.project || this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    const raw = this.assignForm.getRawValue();
    this.projectsService
      .assignTeamMember(this.project.id, {
        teamMemberId: Number(raw.teamMemberId),
        role: String(raw.role).trim(),
      })
      .subscribe({
        next: res => {
          this.project = res.data ?? this.project;
          this.toastr.success('Team member assigned.');
          this.assignForm.reset();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to assign team member.');
        },
      });
  }

  removeMember(teamMemberId: number): void {
    if (!this.project || this.isDeliveryLocked) {
      return;
    }

    this.projectsService.removeTeamMember(this.project.id, teamMemberId).subscribe({
      next: res => {
        this.project = res.data ?? this.project;
        this.toastr.success('Team member removed.');
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to remove team member.');
      },
    });
  }

  private loadProject(): void {
    this.loading = true;
    this.projectsService.getById(this.projectId).subscribe({
      next: res => {
        this.project = res.data ?? null;
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
