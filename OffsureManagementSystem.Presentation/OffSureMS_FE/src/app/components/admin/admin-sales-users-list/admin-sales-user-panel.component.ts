import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { SalesUserDto } from 'app/core/models/team-members/team-member.models';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { TeamMemberResetPasswordModalComponent } from 'app/shared/components/team-member-reset-password-modal/team-member-reset-password-modal.component';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-sales-user-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  templateUrl: './admin-sales-user-panel.component.html',
  styleUrl: './admin-sales-user-panel.component.scss',
})
export class AdminSalesUserPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) salesUserId!: number;
  @Output() saved = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  loading = false;
  saving = false;
  deleting = false;
  deactivating = false;
  activating = false;
  editing = false;
  loadError: string | null = null;
  salesUser: SalesUserDto | null = null;

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
    if (changes['salesUserId'] && this.salesUserId) {
      this.editing = false;
      this.loadSalesUser();
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
    if (!this.salesUser?.isActive) {
      return;
    }
    this.patchForm(this.salesUser);
    this.editing = true;
  }

  openResetPasswordModal(): void {
    if (!this.salesUser?.isActive) {
      return;
    }
    const modalRef = this.modalService.open(TeamMemberResetPasswordModalComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.memberId = this.salesUser.id;
    modalRef.componentInstance.memberName =
      this.salesUser.fullName?.trim() ||
      `${this.salesUser.firstName} ${this.salesUser.lastName}`.trim();
    modalRef.componentInstance.accountType = 'salesUser';
  }

  cancelEdit(): void {
    this.editing = false;
    if (this.salesUser) {
      this.patchForm(this.salesUser);
    }
  }

  saveEdit(): void {
    if (!this.salesUser || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.teamMembersService
      .updateSalesUser(this.salesUser.id, {
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.salesUser = res.data ?? this.salesUser;
          this.patchForm(this.salesUser!);
          this.toastr.success('Sales user updated.');
          this.saving = false;
          this.editing = false;
          this.saved.emit();
        },
        error: err => {
          this.saving = false;
        },
      });
  }

  async deactivateSalesUser(): Promise<void> {
    if (!this.salesUser?.isActive) {
      return;
    }

    const name = this.salesUser.fullName?.trim() || 'this sales user';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Deactivate sales user',
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
      .deactivateSalesUser(this.salesUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.salesUser = res.data ?? this.salesUser;
          this.editing = false;
          this.toastr.success('Sales user deactivated.');
          this.deactivating = false;
          this.saved.emit();
        },
        error: err => {
          this.deactivating = false;
        },
      });
  }

  async activateSalesUser(): Promise<void> {
    if (!this.salesUser || this.salesUser.isActive) {
      return;
    }

    const name = this.salesUser.fullName?.trim() || 'this sales user';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Activate sales user',
      message: `Activate ${name}? They will be able to sign in again.`,
      confirmLabel: 'Activate',
      variant: 'primary',
    });
    if (!confirmed) {
      return;
    }

    this.activating = true;
    this.teamMembersService
      .activateSalesUser(this.salesUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.salesUser = res.data ?? this.salesUser;
          this.patchForm(this.salesUser!);
          this.toastr.success('Sales user activated.');
          this.activating = false;
          this.saved.emit();
        },
        error: err => {
          this.activating = false;
        },
      });
  }

  async deleteSalesUser(): Promise<void> {
    if (!this.salesUser) {
      return;
    }

    const name = this.salesUser.fullName?.trim() || 'this sales user';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete sales user',
      message: `Delete ${name}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.teamMembersService
      .deleteSalesUser(this.salesUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Sales user deleted.');
          this.deleting = false;
          this.deleted.emit();
        },
        error: err => {
          this.deleting = false;
        },
      });
  }

  private loadSalesUser(): void {
    this.loading = true;
    this.loadError = null;
    this.salesUser = null;

    this.teamMembersService
      .getSalesUserById(this.salesUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.salesUser = res.data ?? null;
          if (!this.salesUser) {
            this.loadError = 'Sales user not found.';
            this.loading = false;
            return;
          }
          this.patchForm(this.salesUser);
          this.loading = false;
        },
        error: err => {
          this.loadError = err?.error?.message || 'Failed to load sales user.';
          this.loading = false;
        },
      });
  }

  private patchForm(salesUser: SalesUserDto): void {
    this.form.patchValue({
      firstName: salesUser.firstName ?? '',
      lastName: salesUser.lastName ?? '',
      email: salesUser.email ?? '',
    });
  }
}
