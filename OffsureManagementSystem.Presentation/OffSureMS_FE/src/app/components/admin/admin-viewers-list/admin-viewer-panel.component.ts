import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ViewerUserDto } from 'app/core/models/team-members/team-member.models';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { TeamMemberResetPasswordModalComponent } from 'app/shared/components/team-member-reset-password-modal/team-member-reset-password-modal.component';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-viewer-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  templateUrl: './admin-viewer-panel.component.html',
  styleUrl: './admin-viewer-panel.component.scss',
})
export class AdminViewerPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) viewerUserId!: number;
  @Output() saved = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  loading = false;
  saving = false;
  deleting = false;
  deactivating = false;
  activating = false;
  editing = false;
  loadError: string | null = null;
  viewerUser: ViewerUserDto | null = null;

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
    private confirmDialog: ConfirmDialogService,
    private modalService: NgbModal
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['viewerUserId'] && this.viewerUserId) {
      this.editing = false;
      this.loadViewerUser();
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
    if (!this.viewerUser?.isActive) {
      return;
    }
    this.patchForm(this.viewerUser);
    this.editing = true;
  }

  openResetPasswordModal(): void {
    if (!this.viewerUser?.isActive) {
      return;
    }
    const modalRef = this.modalService.open(TeamMemberResetPasswordModalComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.memberId = this.viewerUser.id;
    modalRef.componentInstance.memberName =
      this.viewerUser.fullName?.trim() ||
      `${this.viewerUser.firstName} ${this.viewerUser.lastName}`.trim();
    modalRef.componentInstance.accountType = 'viewerUser';
  }

  cancelEdit(): void {
    this.editing = false;
    if (this.viewerUser) {
      this.patchForm(this.viewerUser);
    }
  }

  saveEdit(): void {
    if (!this.viewerUser || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.teamMembersService
      .updateViewerUser(this.viewerUser.id, {
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.viewerUser = res.data ?? this.viewerUser;
          this.patchForm(this.viewerUser!);
          this.toastr.success('Viewer user updated.');
          this.saving = false;
          this.editing = false;
          this.saved.emit();
        },
        error: () => {
          this.saving = false;
        },
      });
  }

  async deactivateViewerUser(): Promise<void> {
    if (!this.viewerUser?.isActive) {
      return;
    }

    const name = this.viewerUser.fullName?.trim() || 'this viewer user';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Deactivate viewer user',
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
      .deactivateViewerUser(this.viewerUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.viewerUser = res.data ?? this.viewerUser;
          this.editing = false;
          this.toastr.success('Viewer user deactivated.');
          this.deactivating = false;
          this.saved.emit();
        },
        error: () => {
          this.deactivating = false;
        },
      });
  }

  async activateViewerUser(): Promise<void> {
    if (!this.viewerUser || this.viewerUser.isActive) {
      return;
    }

    const name = this.viewerUser.fullName?.trim() || 'this viewer user';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Activate viewer user',
      message: `Activate ${name}? They will be able to sign in again.`,
      confirmLabel: 'Activate',
      variant: 'primary',
    });
    if (!confirmed) {
      return;
    }

    this.activating = true;
    this.teamMembersService
      .activateViewerUser(this.viewerUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.viewerUser = res.data ?? this.viewerUser;
          this.patchForm(this.viewerUser!);
          this.toastr.success('Viewer user activated.');
          this.activating = false;
          this.saved.emit();
        },
        error: () => {
          this.activating = false;
        },
      });
  }

  async deleteViewerUser(): Promise<void> {
    if (!this.viewerUser) {
      return;
    }

    const name = this.viewerUser.fullName?.trim() || 'this viewer user';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete viewer user',
      message: `Delete ${name}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.teamMembersService
      .deleteViewerUser(this.viewerUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Viewer user deleted.');
          this.deleting = false;
          this.deleted.emit();
        },
        error: () => {
          this.deleting = false;
        },
      });
  }

  private loadViewerUser(): void {
    this.loading = true;
    this.loadError = null;
    this.viewerUser = null;

    this.teamMembersService
      .getViewerUserById(this.viewerUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.viewerUser = res.data ?? null;
          if (!this.viewerUser) {
            this.loadError = 'Viewer user not found.';
            this.loading = false;
            return;
          }
          this.patchForm(this.viewerUser);
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load viewer user.';
          this.loading = false;
        },
      });
  }

  private patchForm(viewerUser: ViewerUserDto): void {
    this.form.patchValue({
      firstName: viewerUser.firstName ?? '',
      lastName: viewerUser.lastName ?? '',
      email: viewerUser.email ?? '',
    });
  }
}
