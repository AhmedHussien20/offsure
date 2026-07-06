import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'app/core/services/auth.service';
import {
  CLIENT_PORTAL_NAME,
  SERVICE_PROVIDER_NAME,
} from 'app/core/constants/branding.constants';

type VerifyState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['../login/login.component.scss'],
})
export class VerifyEmailComponent implements OnInit {
  readonly serviceProviderName = SERVICE_PROVIDER_NAME;
  readonly clientPortalName = CLIENT_PORTAL_NAME;

  state: VerifyState = 'loading';
  message = `Verifying your email with ${SERVICE_PROVIDER_NAME}...`;

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
        this.message =
          res.message ||
          `Your email has been verified. You can now sign in to the ${CLIENT_PORTAL_NAME}.`;
        this.toastr.success(this.message);
      },
      error: err => {
        this.setError(
          err?.error?.message ||
            err?.message ||
            `Email verification failed. Please try again or contact ${SERVICE_PROVIDER_NAME} support.`
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
    }
}
