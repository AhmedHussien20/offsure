import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { ToastrService } from 'ngx-toastr';
import {
  allPasswordRulesMet,
  PASSWORD_RULES,
  PasswordRule,
  passwordMatchValidator,
  passwordStrengthValidator,
} from 'app/core/constants/password-rules.constants';

@Component({
  selector: 'app-team-member-reset-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Reset password</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p class="text-muted small mb-3">
        Set a new password for <strong>{{ memberName }}</strong>. They will need to use this password on their next login.
      </p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="mb-3">
          <label class="form-label">New password</label>
          <input type="password" class="form-control" formControlName="newPassword" autocomplete="new-password" />
        </div>
        @if (showPasswordHints) {
          <ul class="password-rules mb-3">
            @for (rule of passwordRules; track rule.key) {
              <li [class.met]="ruleMet(rule)">
                <i class="fe" [class.fe-check-circle]="ruleMet(rule)" [class.fe-circle]="!ruleMet(rule)"></i>
                {{ rule.label }}
              </li>
            }
          </ul>
        }
        <div class="mb-0">
          <label class="form-label">Confirm password</label>
          <input type="password" class="form-control" formControlName="confirmPassword" autocomplete="new-password" />
          @if (showConfirmHint && confirmPasswordValue && !passwordsMatch) {
            <div class="text-danger small mt-1">Passwords do not match.</div>
          }
        </div>
      </form>
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

  saving = false;
  form!: FormGroup;
  readonly passwordRules = PASSWORD_RULES;

  constructor(
    private fb: FormBuilder,
    private teamMembersService: TeamMembersService,
    private resourceManagerPortal: ResourceManagerPortalService,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group(
      {
        newPassword: ['', [Validators.required, passwordStrengthValidator]],
        confirmPassword: ['', Validators.required],
      },
      { validators: [passwordMatchValidator('newPassword', 'confirmPassword')] }
    );
  }

  get passwordValue(): string {
    return this.form.get('newPassword')?.value ?? '';
  }

  get confirmPasswordValue(): string {
    return this.form.get('confirmPassword')?.value ?? '';
  }

  get showPasswordHints(): boolean {
    const control = this.form.get('newPassword');
    return !!(control?.value || control?.touched || control?.dirty);
  }

  get showConfirmHint(): boolean {
    const control = this.form.get('confirmPassword');
    return !!(control?.value || control?.touched || control?.dirty);
  }

  get passwordsMatch(): boolean {
    return (
      this.passwordValue.length > 0 &&
      this.confirmPasswordValue.length > 0 &&
      this.passwordValue === this.confirmPasswordValue
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

    const { newPassword } = this.form.getRawValue();
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
      error: () => {
        this.saving = false;
      },
    });
  }
}
