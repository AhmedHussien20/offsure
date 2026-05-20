import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'app/core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {

  form!: FormGroup;
  isLoading = false;
  token = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.form = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],
      confirmPassword: ['', Validators.required]
    });

    this.route.queryParams.subscribe(params => {
      this.token = params['token'];

      if (!this.token) {
        this.toastr.error('Invalid reset link');
        this.router.navigate(['/auth/forgot-password']);
      }
    });
  }

  get passwordsMismatch(): boolean {
    const password = this.form.get('password')?.value;
    const confirm = this.form.get('confirmPassword')?.value;

    return password !== confirm;
  }

  submit(): void {

    if (this.form.invalid || this.passwordsMismatch) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const request = {
      token: this.token,
      newPassword: this.form.value.password
    };

    this.authService.resetPassword(request).subscribe({
      next: () => {
        this.isLoading = false;

        this.toastr.success(
          'Password reset successfully'
        );

        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.isLoading = false;

        this.toastr.error(
          err?.error?.message ||
          'Reset password failed'
        );
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword =
      !this.showConfirmPassword;
  }
}