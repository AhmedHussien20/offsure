import { Component, OnInit, OnDestroy, Renderer2, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from 'app/core/services/auth.service';
import { RegisterRequest } from 'app/core/models/auth/register-request.model';
import {
  CLIENT_PORTAL_NAME,
  SERVICE_PROVIDER_NAME,
} from 'app/core/constants/branding.constants';

interface RegisterStep {
  id: number;
  label: string;
  shortLabel: string;
}

interface PasswordRule {
  key: string;
  label: string;
  test: (value: string) => boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit, OnDestroy {
  readonly serviceProviderName = SERVICE_PROVIDER_NAME;
  readonly clientPortalName = CLIENT_PORTAL_NAME;

  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  currentStep = 0;

  readonly steps: RegisterStep[] = [
    { id: 0, label: 'Personal Information', shortLabel: 'Personal' },
    { id: 1, label: 'Company Information', shortLabel: 'Company' },
    { id: 2, label: 'Security', shortLabel: 'Security' },
  ];

  readonly passwordRules: PasswordRule[] = [
    { key: 'minLength', label: 'At least 8 characters', test: v => v.length >= 8 },
    { key: 'upper', label: 'One uppercase letter (A–Z)', test: v => /[A-Z]/.test(v) },
    { key: 'lower', label: 'One lowercase letter (a–z)', test: v => /[a-z]/.test(v) },
    { key: 'number', label: 'One number (0–9)', test: v => /\d/.test(v) },
    { key: 'special', label: 'One special character (!@#$…)', test: v => /[^A-Za-z0-9]/.test(v) },
  ];

  private readonly stepFields: string[][] = [
    ['firstName', 'lastName', 'email', 'contactPersonPhone'],
    ['companyName'],
    ['password', 'confirmedPassword'],
  ];

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private renderer: Renderer2,
    private translate: TranslateService
  ) {
    this.translate.use('en');
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }

  ngOnInit(): void {
    this.renderer.addClass(this.document.body, 'register-page');
    this.initializeForm();
    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.registerForm.get('confirmedPassword')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  get activeStep(): RegisterStep {
    return this.steps[this.currentStep];
  }

  get passwordValue(): string {
    return this.registerForm.get('password')?.value ?? '';
  }

  get confirmPasswordValue(): string {
    return this.registerForm.get('confirmedPassword')?.value ?? '';
  }

  get showPasswordHints(): boolean {
    const control = this.registerForm.get('password');
    return !!(control?.value || control?.touched || control?.dirty);
  }

  get showConfirmHint(): boolean {
    const control = this.registerForm.get('confirmedPassword');
    return !!(control?.value || control?.touched || control?.dirty);
  }

  get passwordsMatch(): boolean {
    const password = this.passwordValue;
    const confirm = this.confirmPasswordValue;
    return password.length > 0 && confirm.length > 0 && password === confirm;
  }

  get allPasswordRulesMet(): boolean {
    return this.passwordRules.every(rule => rule.test(this.passwordValue));
  }

  ruleMet(rule: PasswordRule): boolean {
    return rule.test(this.passwordValue);
  }

  isInvalid(controlName: string): boolean {
    const control = this.registerForm.get(controlName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  nextStep(): void {
    if (!this.validateCurrentStep()) {
      return;
    }
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length || index === this.currentStep) {
      return;
    }
    if (index < this.currentStep) {
      this.currentStep = index;
      return;
    }
    for (let i = this.currentStep; i < index; i++) {
      const previousStep = this.currentStep;
      if (!this.validateCurrentStep()) {
        this.currentStep = previousStep;
        return;
      }
      this.currentStep++;
    }
  }

  private validateCurrentStep(): boolean {
    const fields = this.stepFields[this.currentStep];
    let valid = true;

    fields.forEach(name => {
      const control = this.registerForm.get(name);
      if (!control) {
        return;
      }
      control.markAsTouched();
      if (control.invalid) {
        valid = false;
      }
    });

    if (this.currentStep === 2) {
      if (this.registerForm.hasError('passwordMismatch')) {
        this.registerForm.get('confirmedPassword')?.markAsTouched();
        valid = false;
      }
      if (!this.allPasswordRulesMet) {
        this.registerForm.get('password')?.markAsTouched();
        valid = false;
      }
    }

    if (!valid) {
      if (this.currentStep === 2 && this.registerForm.hasError('passwordMismatch')) {
        this.toastr.warning('Passwords do not match.');
      } else {
        this.toastr.warning('Please complete the required fields before continuing.');
      }
    }

    return valid;
  }

  private initializeForm(): void {
    this.registerForm = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, this.passwordStrengthValidator.bind(this)]],
        confirmedPassword: ['', [Validators.required]],
        companyName: ['', [Validators.required]],
        contactPersonPhone: ['', [Validators.required]],
        companyAddress: [''],
        city: [''],
        country: [''],
        postalCode: [''],
      },
      { validators: [this.passwordMatchValidator] }
    );
  }

  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value ?? '';
    if (!value) {
      return null;
    }
    const failed = this.passwordRules.filter(rule => !rule.test(value));
    return failed.length ? { passwordStrength: true } : null;
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmedPassword = control.get('confirmedPassword');

    if (!password || !confirmedPassword) {
      return null;
    }

    return password.value === confirmedPassword.value ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submit(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();

      if (this.registerForm.hasError('passwordMismatch')) {
        this.toastr.error('Passwords do not match');
      } else if (!this.allPasswordRulesMet) {
        this.toastr.error('Please meet all password requirements');
      } else {
        this.toastr.error('Please fill all required fields correctly');
      }
      return;
    }

    this.isLoading = true;
    const formValue = this.registerForm.value;

    const registerRequest: RegisterRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      password: formValue.password,
      companyName: formValue.companyName,
      contactPersonPhone: formValue.contactPersonPhone || undefined,
      companyAddress: formValue.companyAddress || undefined,
      city: formValue.city || undefined,
      country: formValue.country || undefined,
      postalCode: formValue.postalCode || undefined,
    };

    this.authService.register(registerRequest).subscribe({
      next: res => {
        this.isLoading = false;
        const message =
          res.message ||
          `Account created. Check your inbox for a verification email from ${SERVICE_PROVIDER_NAME} to activate your ${CLIENT_PORTAL_NAME} account.`;
        this.toastr.success(message, 'Registration successful', { timeOut: 8000 });
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2500);
      },
      error: error => {
        this.isLoading = false;
        const errorMessage =
          error?.error?.message || error?.message || 'Registration failed. Please try again.';
        console.error('Registration error:', error);
      },
    });
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(this.document.body, 'register-page');
  }
}
