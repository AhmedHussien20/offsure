import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/services/auth.service';

@Component({
  selector: 'app-home-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="text-muted px-3">Redirecting…</div>`,
})
export class HomeRedirectComponent implements OnInit {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { replaceUrl: true });
      return;
    }

    // System portal users: ADMIN → /admin/dashboard, OPERATIONS → /ops/dashboard (fallback: /admin/dashboard).
    if (this.auth.isSystemPortalUser()) {
      const u = this.auth.getUser() as { roles?: string[] } | null;
      const roles = (u?.roles ?? []).map(r => String(r).toUpperCase());
      const isOpsOnly = roles.includes('OPERATIONS') && !roles.includes('ADMIN');
      this.router.navigate([isOpsOnly ? '/ops/dashboard' : '/admin/dashboard'], { replaceUrl: true });
      return;
    }

    // Customer portal users go to customer home dashboard.
    this.router.navigate(['/customer/home'], { replaceUrl: true });
  }
}

