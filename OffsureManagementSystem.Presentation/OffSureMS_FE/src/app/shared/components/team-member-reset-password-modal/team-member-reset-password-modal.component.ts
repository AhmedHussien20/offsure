import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { ToastrService } from 'ngx-toastr';
import {
  allPasswordRulesMet,
  PASSWORD_RULES,
  PasswordRule,
  passwordMatchValidator,
  passwordStrengthValidator,
} from 'app/core/constants/password-rules.constants';

export type AdminPasswordResetAccountType = 'teamMember' | 'salesUser' | 'resourceManager';

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
      <ul class="password-rules mt-3 mb-0">
        @for (rule of passwordRules; track rule.key) {
          <li [class.met]="ruleMet(rule)">
            <i class="fe" [class.fe-check-circle]="ruleMet(rule)" [class.fe-circle]="!ruleMet(rule)"></i>
            {{ rule.label }}
          </li>
        }
      </ul>
      @if (showConfirmMismatch) {
        <div class="text-danger small mt-2">Passwords do not match.</div>
      }
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="saving" (click)="submit()">
        {{ saving ? 'Resetting…' : 'Reset password' }}
      </button>
    </div>
  `,
  styles: [
    `
      :host ::ng-deep .generic-form > .form-group {
        flex: 0 0 50%;
        max-width: 50%;
      }
      .password-rules {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.35rem;
        font-size: 0.82rem;
        color: #64748b;
      }
      .password-rules li {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .password-rules li.met {
        color: #16a34a;
      }
    `,
  ],
})
export class TeamMemberResetPasswordModalComponent {
  @Input({ required: true }) memberId!: number;
  @Input({ required: true }) memberName!: string;
  @Input() useResourceManagerPortal = false;
  /** Which admin account API to call. Ignored when useResourceManagerPortal is true. */
  @Input() accountType: AdminPasswordResetAccountType = 'teamMember';

  saving = false;
  form!: FormGroup;
  readonly passwordRules = PASSWORD_RULES;
  readonly formConfig: FormFieldConfig[] = [
    {
      type: 'input',
      inputType: 'password',
      name: 'password',
      label: 'New password',
      validations: { required: true, minlength: 8 },
      showPassword: false,
    },
    {
      type: 'input',
      inputType: 'password',
      name: 'confirmPassword',
      label: 'Confirm password',
      validations: { required: true },
      showPassword: false,
    },
  ];

  constructor(
    private fb: FormBuilder,
    private teamMembersService: TeamMembersService,
    private resourceManagerPortal: ResourceManagerPortalService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, passwordStrengthValidator]],
        confirmPassword: ['', Validators.required],
      },
      { validators: [passwordMatchValidator('password', 'confirmPassword')] }
    );
  }

  get passwordValue(): string {
    return this.form.get('password')?.value ?? '';
  }

  get confirmPasswordValue(): string {
    return this.form.get('confirmPassword')?.value ?? '';
  }

  get passwordsMatch(): boolean {
    return (
      this.passwordValue.length > 0 &&
      this.confirmPasswordValue.length > 0 &&
      this.passwordValue === this.confirmPasswordValue
    );
  }

  get showConfirmMismatch(): boolean {
    const confirm = this.form.get('confirmPassword');
    return !!(
      confirm &&
      (confirm.touched || confirm.dirty) &&
      this.confirmPasswordValue &&
      !this.passwordsMatch
    );
  }

  ruleMet(rule: PasswordRule): boolean {
    return rule.test(this.passwordValue);
  }

  submit(): void {
    if (this.form.invalid || !allPasswordRulesMet(this.passwordValue)) {
      this.form.markAllAsTouched();
      if (!allPasswordRulesMet(this.passwordValue)) {
        this.toastr.error('Please meet all password requirements');
      }
      return;
    }

    if (!this.passwordsMatch) {
      this.toastr.error('Passwords do not match.');
      return;
    }

    const newPassword = this.passwordValue;
    this.saving = true;
    const dto = { newPassword };
    const request$ = this.useResourceManagerPortal
      ? this.resourceManagerPortal.resetTeamMemberPassword(this.memberId, dto)
      : this.accountType === 'salesUser'
        ? this.teamMembersService.resetSalesUserPassword(this.memberId, dto)
        : this.accountType === 'resourceManager'
          ? this.teamMembersService.resetResourceManagerPassword(this.memberId, dto)
          : this.teamMembersService.resetPassword(this.memberId, dto);

    request$.subscribe({
      next: () => {
        this.toastr.success('Password reset successfully.');
        this.saving = false;
        this.activeModal.close(true);
      },
      error: () => {
        this.saving = false;
      },
    });
  }
}
