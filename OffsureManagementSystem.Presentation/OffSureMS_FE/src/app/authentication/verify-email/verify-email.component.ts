import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'app/core/services/auth.service';

type VerifyState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['../login/login.component.scss'],
})
export class VerifyEmailComponent implements OnInit {
  state: VerifyState = 'loading';
  message = 'Verifying your email...';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userId = Number(this.route.snapshot.queryParamMap.get('userId'));
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!userId || !token) {
      this.setError('Invalid verification link.');
      return;
    }

    this.authService.verifyEmail(userId, token).subscribe({
      next: res => {
        this.state = 'success';
        this.message = res.message || 'Email verified successfully. You can now log in.';
        this.toastr.success(this.message);
      },
      error: err => {
        this.setError(
          err?.error?.message || err?.message || 'Email verification failed.'
        );
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private setError(message: string): void {
    this.state = 'error';
    this.message = message;
    this.toastr.error(message);
  }
}
