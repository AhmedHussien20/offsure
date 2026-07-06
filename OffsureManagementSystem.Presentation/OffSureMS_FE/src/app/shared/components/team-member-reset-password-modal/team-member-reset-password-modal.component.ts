import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-team-member-reset-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericFormComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Reset password</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p class="text-muted small mb-3">
        Set a new password for <strong>{{ memberName }}</strong>. They will need to use this password on their next login.
      </p>
      <app-generic-form [formGroup]="form" [formConfig]="formConfig" [showSubmit]="false"></app-generic-form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="saving" (click)="submit()">
        {{ saving ? 'Resetting…' : 'Reset password' }}
      </button>
    </div>
  `,
})
export class TeamMemberResetPasswordModalComponent {
  @Input({ required: true }) memberId!: number;
  @Input({ required: true }) memberName!: string;
  @Input() useResourceManagerPortal = false;

  saving = false;
  form!: FormGroup;
  readonly formConfig: FormFieldConfig[] = [
    {
      type: 'input',
      inputType: 'password',
      name: 'newPassword',
      label: 'New password',
      validations: { required: true, minlength: 8 },
    },
    {
      type: 'input',
      inputType: 'password',
      name: 'confirmPassword',
      label: 'Confirm password',
      validations: { required: true, minlength: 8 },
    },
  ];

  constructor(
    private fb: FormBuilder,
    private teamMembersService: TeamMembersService,
    private resourceManagerPortal: ResourceManagerPortalService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.toastr.error('Passwords do not match.');
      return;
    }

    this.saving = true;
    const request$ = this.useResourceManagerPortal
      ? this.resourceManagerPortal.resetTeamMemberPassword(this.memberId, { newPassword })
      : this.teamMembersService.resetPassword(this.memberId, { newPassword });

    request$.subscribe({
      next: () => {
        this.toastr.success('Password reset successfully.');
        this.saving = false;
        this.activeModal.close(true);
      },
      error: err => {
        this.saving = false;
      },
    });
  }
}
