import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Customer portal routes — requires JWT with `userData.type === 'customer'`. */
export const customerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const u = auth.getUser() as { type?: string } | null;
  if (!u || u.type !== 'customer') {
    router.navigate(['/auth/forbidden']);
    return false;
  }

  return true;
};
