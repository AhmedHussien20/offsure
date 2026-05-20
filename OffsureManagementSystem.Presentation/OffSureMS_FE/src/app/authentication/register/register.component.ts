import { Component, OnInit, OnDestroy, Renderer2, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from 'app/core/services/auth.service';
import { RegisterRequest } from 'app/core/models/auth/register-request.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgbModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;

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
  }

  private initializeForm(): void {
    this.registerForm = this.fb.group(
      {
        // Required fields
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmedPassword: ['', [Validators.required]],
        companyName: ['', [Validators.required]],
        
        // Optional fields
        contactPersonPhone: [''],
        companyAddress: [''],
        city: [''],
        country: [''],
        postalCode: [''],
        website: ['', [Validators.pattern('https?://.+')]],
        description: ['']
      },
      { validators: [this.passwordMatchValidator] }
    );
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmedPassword = control.get('confirmedPassword');

    if (!password || !confirmedPassword) {
      return null;
    }

    return password.value === confirmedPassword.value
      ? null
      : { passwordMismatch: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      
      if (this.registerForm.hasError('passwordMismatch')) {
        this.toastr.error('Passwords do not match');
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
      website: formValue.website || undefined,
      description: formValue.description || undefined
    };

    this.authService.register(registerRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.toastr.success('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 1500);
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error?.error?.message || error?.message || 'Registration failed. Please try again.';
        this.toastr.error(errorMessage);
        console.error('Registration error:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(this.document.body, 'register-page');
  }
}