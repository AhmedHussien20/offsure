import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Minimal-change: `/admin/*` is SYSTEM_ADMIN-only (ADMIN internal role).
const internalRoles = new Set(['ADMIN']);

/** Administration portal routes — requires JWT from POST api/v1/admin/auth/login (`type=system`) with ADMIN role. */
export const operationsGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/auth/admin/login'], { queryParams: { returnUrl: router.url } });
    return false;
  }

  const u = auth.getUser() as {
    type?: string;
    roles?: string[];
    role?: string | number;
    roleText?: string;
  } | null;

  if (u?.type === 'system') {
    const roles = (u.roles ?? []).map(r => String(r).toUpperCase());
    const allowed = roles.some(r => internalRoles.has(r));
    if (!allowed) {
      router.navigate(['/auth/forbidden']);
      return false;
    }
    return true;
  }

  const roleText = String(u?.roleText ?? '');
  const role = u?.role;
  const isOps =
    roleText === 'OPERATIONS' ||
    role === 'OPERATIONS' ||
    role === 2;

  if (!isOps) {
    router.navigate(['/auth/forbidden']);
    return false;
  }

  return true;
};
