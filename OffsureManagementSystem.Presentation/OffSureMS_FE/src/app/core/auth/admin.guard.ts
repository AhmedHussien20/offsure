import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Restricts routes to authenticated system-portal users (`type=system`). */
export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/auth/admin/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  if (!auth.isSystemPortalUser()) {
    router.navigate(['/auth/forbidden']);
    return false;
  }

  return true;
};

