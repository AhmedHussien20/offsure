import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ResourceManagerUserDto } from 'app/core/models/team-members/team-member.models';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-resource-manager-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  templateUrl: './admin-resource-manager-panel.component.html',
  styleUrl: './admin-resource-manager-panel.component.scss',
})
export class AdminResourceManagerPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) managerId!: number;
  @Output() saved = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  loading = false;
  saving = false;
  deleting = false;
  deactivating = false;
  activating = false;
  editing = false;
  loadError: string | null = null;
  manager: ResourceManagerUserDto | null = null;

  form!: FormGroup;
  readonly formConfig: FormFieldConfig[] = [
    { type: 'input', inputType: 'text', name: 'firstName', label: 'First Name', validations: { required: true } },
    { type: 'input', inputType: 'text', name: 'lastName', label: 'Last Name', validations: { required: true } },
    { type: 'input', inputType: 'email', name: 'email', label: 'Email', validations: { required: true } },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private teamMembersService: TeamMembersService,
    private toastr: ToastrService,
    private confirmDialog: ConfirmDialogService
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['managerId'] && this.managerId) {
      this.editing = false;
      this.loadManager();
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

  startEdit(): void {
    if (!this.manager?.isActive) {
      return;
    }
    this.patchForm(this.manager);
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    if (this.manager) {
      this.patchForm(this.manager);
    }
  }

  saveEdit(): void {
    if (!this.manager || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.teamMembersService
      .updateResourceManager(this.manager.id, {
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.manager = res.data ?? this.manager;
          this.patchForm(this.manager!);
          this.toastr.success('Resource manager updated.');
          this.saving = false;
          this.editing = false;
          this.saved.emit();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update resource manager.');
          this.saving = false;
        },
      });
  }

  async deactivateManager(): Promise<void> {
    if (!this.manager?.isActive) {
      return;
    }

    const name = this.manager.fullName?.trim() || 'this resource manager';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Deactivate resource manager',
      message: `Deactivate ${name}? They will no longer be able to sign in.`,
      confirmLabel: 'Deactivate',
      variant: 'warning',
      icon: 'ti-user-off',
    });
    if (!confirmed) {
      return;
    }

    this.deactivating = true;
    this.teamMembersService
      .deactivateResourceManager(this.manager.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.manager = res.data ?? this.manager;
          this.editing = false;
          this.toastr.success('Resource manager deactivated.');
          this.deactivating = false;
          this.saved.emit();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to deactivate resource manager.');
          this.deactivating = false;
        },
      });
  }

  async activateManager(): Promise<void> {
    if (!this.manager || this.manager.isActive) {
      return;
    }

    const name = this.manager.fullName?.trim() || 'this resource manager';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Activate resource manager',
      message: `Activate ${name}? They will be able to sign in again.`,
      confirmLabel: 'Activate',
      variant: 'primary',
    });
    if (!confirmed) {
      return;
    }

    this.activating = true;
    this.teamMembersService
      .activateResourceManager(this.manager.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.manager = res.data ?? this.manager;
          this.patchForm(this.manager!);
          this.toastr.success('Resource manager activated.');
          this.activating = false;
          this.saved.emit();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to activate resource manager.');
          this.activating = false;
        },
      });
  }

  async deleteManager(): Promise<void> {
    if (!this.manager) {
      return;
    }

    const name = this.manager.fullName?.trim() || 'this resource manager';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete resource manager',
      message: `Delete ${name}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.teamMembersService
      .deleteResourceManager(this.manager.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Resource manager deleted.');
          this.deleting = false;
          this.deleted.emit();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to delete resource manager.');
          this.deleting = false;
        },
      });
  }

  private loadManager(): void {
    this.loading = true;
    this.loadError = null;
    this.manager = null;

    this.teamMembersService
      .getResourceManagerById(this.managerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.manager = res.data ?? null;
          if (!this.manager) {
            this.loadError = 'Resource manager not found.';
            this.loading = false;
            return;
          }
          this.patchForm(this.manager);
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load resource manager.';
          this.loading = false;
        },
      });
  }

  private patchForm(manager: ResourceManagerUserDto): void {
    this.form.patchValue({
      firstName: manager.firstName ?? '',
      lastName: manager.lastName ?? '',
      email: manager.email ?? '',
    });
  }
}
