import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'app/core/services/auth.service';

@Component({
  selector: 'app-warning-message',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './warning-message.component.html',
  styleUrl: './warning-message.component.scss'
})
export class WarningMessageComponent {
  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  /** Send the user to the home dashboard for their portal (customer vs staff). */
  goHome(): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const u = this.auth.getUser() as
      | { type?: string; roles?: string[] }
      | null;

    if (u?.type === 'customer') {
      this.router.navigate(['/customer/home']);
      return;
    }

    if (u?.type === 'system') {
      const roles = (u.roles ?? []).map(r => String(r).toUpperCase());
      if (roles.includes('OPERATIONS')) {
        this.router.navigate(['/ops/dashboard']);
        return;
      }
      if (roles.includes('ADMIN')) {
        this.router.navigate(['/admin/dashboard']);
        return;
      }
    }

    this.router.navigate(['/auth/login']);
  }
}
