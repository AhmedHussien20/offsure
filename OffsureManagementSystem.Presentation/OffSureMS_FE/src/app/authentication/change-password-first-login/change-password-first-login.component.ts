import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from 'app/core/services/auth.service';

/** Mirrors backend ChangePasswordFirstLoginRequestDtoValidator (min 12 + complexity). */
function firstLoginPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const v = (control.value as string) || '';
  if (v.length === 0) {
    return null;
  }
  if (v.length < 12) {
    return { firstLoginPassword: true };
  }
  if (!/[A-Z]/.test(v) || !/[a-z]/.test(v) || !/[0-9]/.test(v) || !/[^A-Za-z0-9]/.test(v)) {
    return { firstLoginPassword: true };
  }
  return null;
}

@Component({
  selector: 'app-change-password-first-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule
  ],
  templateUrl: './change-password-first-login.component.html',
  styleUrls: ['./change-password-first-login.component.scss']
})
export class ChangePasswordFirstLoginComponent implements OnInit {

  form!: FormGroup;
  userId!: number;
  otpSessionToken!: string;
  usernameOrEmail!: string;

  // ─── UI State ─────────────────────────────────────────────────────────────
  isSessionValid = false;
  loading = true;
  isSubmitting = false;
  errorMessage = '';
  showNewPassword = false;
  showConfirmPassword = false;

  // ─── Password Strength ────────────────────────────────────────────────────
  get passwordValue(): string {
    return this.form?.get('newPassword')?.value || '';
  }

  get hasMinLength(): boolean { return this.passwordValue.length >= 12; }
  get hasUppercase(): boolean { return /[A-Z]/.test(this.passwordValue); }
  get hasLowercase(): boolean { return /[a-z]/.test(this.passwordValue); }
  get hasNumber(): boolean { return /[0-9]/.test(this.passwordValue); }
  get hasSpecial(): boolean { return /[^A-Za-z0-9]/.test(this.passwordValue); }

  get strengthScore(): number {
    return [
      this.hasMinLength,
      this.hasUppercase,
      this.hasLowercase,
      this.hasNumber,
      this.hasSpecial
    ].filter(Boolean).length;
  }

  get strengthLabel(): string {
    const labels = [
      '',
      'FIRST_LOGIN.STRENGTH_WEAK',
      'FIRST_LOGIN.STRENGTH_FAIR',
      'FIRST_LOGIN.STRENGTH_MEDIUM',
      'FIRST_LOGIN.STRENGTH_GOOD',
      'FIRST_LOGIN.STRENGTH_STRONG'
    ];
    return labels[this.strengthScore] || '';
  }

  get strengthColor(): string {
    return ['', 'danger', 'warning', 'warning', 'info', 'success'][this.strengthScore];
  }

  getStrengthClass(bar: number): string {
    if (this.strengthScore >= bar) {
      return `active bg-${this.strengthColor}`;
    }
    return '';
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const rawUserId = localStorage.getItem('otpUserId') || '';
    this.userId = Number(rawUserId);
    this.otpSessionToken = localStorage.getItem('otpSessionToken') || '';
    this.usernameOrEmail = localStorage.getItem('otpUsernameOrEmail') || '';

    // Guard: if session data is missing, abort immediately — no backend call needed
    if (!this.userId || !this.otpSessionToken) {
      this.errorMessage = '';
      this.loading = false;
      this.isSessionValid = false;
      return;
    }

    // Session is present — trust it and show the form directly.
    // The OTP is now validated during the unified login call.
    this.isSessionValid = true;
    this.loading = false;

    this.form = this.fb.group({
      newPassword: ['', [Validators.required, firstLoginPasswordValidator]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.form.value;

    if (newPassword !== confirmPassword) {
      this.toastr.error('FIRST_LOGIN.PASSWORDS_NOT_MATCH');
      return;
    }

    this.isSubmitting = true;

    this.authService.changePasswordFirstLogin({
      userId: this.userId,
      otpSessionToken: this.otpSessionToken,
      newPassword
    }).subscribe({
      next: () => {
        this.isSubmitting = false;

        // Clean up all first-login session data
        localStorage.removeItem('otpUserId');
        localStorage.removeItem('otpSessionToken');
        localStorage.removeItem('otpUsernameOrEmail');

        // Navigate to success screen, then to login
        this.router.navigate(['/auth/first-login-success']);
      },
      error: (err) => {
        this.isSubmitting = false;
      }
    });
  }
}
