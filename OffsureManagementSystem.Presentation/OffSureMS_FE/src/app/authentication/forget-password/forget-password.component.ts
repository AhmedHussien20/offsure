import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from 'app/core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule
  ],
  templateUrl: './forget-password.component.html',
    styleUrls: ['./forget-password.component.scss']


})
export class ForgotPasswordComponent {
  form!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    protected authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

   submit(): void {
  if (this.form.invalid) return;

  this.isLoading = true;
  const email = this.form.value.email;

  this.authService.forgotPassword(email).subscribe({
    next: () => {
      this.isLoading = false;
      this.toastr.success('FORGOT_PASSWORD.CODE_SENT_SUCCESS');

      localStorage.setItem('resetEmail', email);

      // Password reset flow is separate from first-login OTP.
      // Keep user on login after sending the code.
      this.router.navigate(['/auth/login']);
    },
    error: (err) => {
      this.isLoading = false;
    }
  });
}

}
