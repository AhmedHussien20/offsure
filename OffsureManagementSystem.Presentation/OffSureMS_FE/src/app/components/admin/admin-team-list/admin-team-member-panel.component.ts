import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PROFICIENCY_LABELS } from 'app/components/team/team.constants';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import {
  ResourceManagerUserDto,
  TeamMemberDto,
  TeamMemberSkillDto,
  UpsertTeamMemberSkillDto,
} from 'app/core/models/team-members/team-member.models';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { TeamMemberSkillsEditorComponent } from 'app/shared/components/team-member-skills-editor/team-member-skills-editor.component';
import { TeamMemberResetPasswordModalComponent } from 'app/shared/components/team-member-reset-password-modal/team-member-reset-password-modal.component';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-team-member-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent, TeamMemberSkillsEditorComponent],
  templateUrl: './admin-team-member-panel.component.html',
  styleUrl: './admin-team-member-panel.component.scss',
})
export class AdminTeamMemberPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) memberId!: number;
  @Output() saved = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  loading = false;
  saving = false;
  deleting = false;
  editing = false;
  loadError: string | null = null;
  member: TeamMemberDto | null = null;
  initialSkills: TeamMemberSkillDto[] = [];
  skillAssignments: UpsertTeamMemberSkillDto[] = [];
  resourceManagers: ResourceManagerUserDto[] = [];

  form!: FormGroup;
  readonly formConfig: FormFieldConfig[] = [
    { type: 'input', inputType: 'text', name: 'firstName', label: 'First Name', validations: { required: true } },
    { type: 'input', inputType: 'text', name: 'lastName', label: 'Last Name', validations: { required: true } },
    { type: 'input', inputType: 'email', name: 'email', label: 'Email', validations: { required: true } },
    { type: 'input', inputType: 'text', name: 'title', label: 'Job Title' },
    { type: 'input', inputType: 'text', name: 'phoneNumber', label: 'Phone' },
    { type: 'input', inputType: 'number', name: 'yearsOfExperience', label: 'Years of Experience' },
    {
      type: 'input',
      inputType: 'number',
      name: 'hourlySalary',
      label: 'Hourly salary ($)',
      placeholder: 'Default rate per hour',
    },
    { type: 'checkbox', name: 'isAvailable', label: 'Available for assignment' },
    {
      type: 'select',
      name: 'resourceManagerId',
      label: 'Resource manager',
      selectType: 'simple',
      options: [],
      validations: { required: true },
    },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private teamMembersService: TeamMembersService,
    private toastr: ToastrService,
    private confirmDialog: ConfirmDialogService,
    private modalService: NgbModal
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      title: [''],
      phoneNumber: [''],
      yearsOfExperience: [null],
      hourlySalary: [null],
      isAvailable: [true],
      resourceManagerId: [null, Validators.required],
    });
    this.loadResourceManagers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['memberId'] && this.memberId) {
      this.editing = false;
      this.loadMember();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  display(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  proficiencyLabel(level: number): string {
    return PROFICIENCY_LABELS[level] ?? `Level ${level}`;
  }

  startEdit(): void {
    if (!this.member) {
      return;
    }
    this.patchForm(this.member);
    this.initialSkills = [...(this.member.skillAssignments ?? [])];
    this.skillAssignments = [];
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    if (this.member) {
      this.patchForm(this.member);
      this.initialSkills = [...(this.member.skillAssignments ?? [])];
      this.skillAssignments = [];
    }
  }

  onSkillsChange(skills: UpsertTeamMemberSkillDto[]): void {
    this.skillAssignments = skills;
  }

  openResetPasswordModal(): void {
    if (!this.member) {
      return;
    }

    const modalRef = this.modalService.open(TeamMemberResetPasswordModalComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.memberId = this.member.id;
    modalRef.componentInstance.memberName = `${this.member.firstName} ${this.member.lastName}`.trim();
    modalRef.componentInstance.useResourceManagerPortal = false;
  }

  saveEdit(): void {
    if (!this.member || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.teamMembersService
      .update(this.member.id, {
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
        title: raw.title?.trim() ?? '',
        phoneNumber: raw.phoneNumber?.trim(),
        yearsOfExperience:
          raw.yearsOfExperience != null && raw.yearsOfExperience !== ''
            ? Number(raw.yearsOfExperience)
            : 0,
        hourlySalary:
          raw.hourlySalary != null && raw.hourlySalary !== '' ? Number(raw.hourlySalary) : undefined,
        isAvailable: !!raw.isAvailable,
        resourceManagerId: Number(raw.resourceManagerId),
        skillAssignments: this.skillAssignments.length ? this.skillAssignments : [],
      })
      .subscribe({
        next: res => {
          this.member = res.data ?? this.member;
          this.patchForm(this.member!);
          this.initialSkills = [...(this.member?.skillAssignments ?? [])];
          this.skillAssignments = [];
          this.toastr.success('Team member updated.');
          this.saving = false;
          this.editing = false;
          this.saved.emit();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update team member.');
          this.saving = false;
        },
      });
  }

  async deleteMember(): Promise<void> {
    if (!this.member) {
      return;
    }

    const name = `${this.member.firstName} ${this.member.lastName}`.trim() || 'this member';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete team member',
      message: `Delete ${name}? This action cannot be undone.`,
      confirmLabel: 'Delete member',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.teamMembersService.delete(this.member.id).subscribe({
      next: () => {
        this.toastr.success('Team member deleted.');
        this.deleting = false;
        this.deleted.emit();
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to delete team member.');
        this.deleting = false;
      },
    });
  }

  private loadMember(): void {
    this.loading = true;
    this.loadError = null;
    this.member = null;

    this.teamMembersService
      .getById(this.memberId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.member = res.data ?? null;
          if (!this.member) {
            this.loadError = 'Team member not found.';
            this.loading = false;
            return;
          }
          this.initialSkills = [...(this.member.skillAssignments ?? [])];
          this.skillAssignments = [];
          this.patchForm(this.member);
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load team member.';
          this.loading = false;
        },
      });
  }

  private patchForm(member: TeamMemberDto): void {
    this.form.patchValue({
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      email: member.email ?? '',
      title: member.title ?? '',
      phoneNumber: member.phoneNumber ?? '',
      yearsOfExperience: member.yearsOfExperience ?? null,
      hourlySalary: member.hourlySalary ?? null,
      isAvailable: member.isAvailable ?? true,
      resourceManagerId: member.resourceManagerId ?? null,
    });
  }

  private loadResourceManagers(): void {
    this.teamMembersService.getResourceManagers({ pageIndex: 1, pageSize: 100 }).subscribe({
      next: res => {
        this.resourceManagers = res.data?.data ?? [];
        const rmField = this.formConfig.find(f => f.name === 'resourceManagerId');
        if (rmField) {
          rmField.options = this.resourceManagers.map(rm => ({
            id: rm.id,
            name: rm.fullName || `${rm.firstName} ${rm.lastName}`.trim(),
          }));
        }
      },
    });
  }
}
