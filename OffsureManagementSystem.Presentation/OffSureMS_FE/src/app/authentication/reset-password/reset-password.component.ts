import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'app/core/services/auth.service';
import {
  allPasswordRulesMet,
  PASSWORD_RULES,
  PasswordRule,
  passwordMatchValidator,
  passwordStrengthValidator,
} from 'app/core/constants/password-rules.constants';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  token = '';
  showPassword = false;
  showConfirmPassword = false;
  readonly passwordRules = PASSWORD_RULES;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, passwordStrengthValidator]],
        confirmPassword: ['', Validators.required],
      },
      { validators: [passwordMatchValidator('password', 'confirmPassword')] }
    );

    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.toastr.error('Invalid reset link');
        this.router.navigate(['/auth/forgot-password']);
      }
    });
  }

  get passwordValue(): string {
    return this.form.get('password')?.value ?? '';
  }

  get confirmPasswordValue(): string {
    return this.form.get('confirmPassword')?.value ?? '';
  }

  get showPasswordHints(): boolean {
    const control = this.form.get('password');
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
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.authService
      .resetPassword({
        token: this.token,
        newPassword: this.form.value.password,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastr.success('Password reset successfully');
          this.router.navigate(['/auth/login']);
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
