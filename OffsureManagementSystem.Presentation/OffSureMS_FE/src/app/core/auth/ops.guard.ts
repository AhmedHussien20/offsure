import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const internalRoles = new Set(['OPERATIONS', 'ADMIN']);

/** Ops portal routes — requires system JWT (`type=system`) with OPERATIONS (or ADMIN) internal role. */
export const opsGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/auth/admin/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const u = auth.getUser() as {
    type?: string;
    roles?: string[];
    role?: string | number;
    roleText?: string;
  } | null;

  // Primary: system portal staff payload (`type=system`, `roles: string[]`)
  if (u?.type === 'system') {
    const roles = (u.roles ?? []).map(r => String(r).toUpperCase());
    const allowed = roles.some(r => internalRoles.has(r));
    if (allowed) return true;
  }

  // Back-compat / inconsistent auth payloads: allow OPERATIONS by roleText/role.
  const roleText = String(u?.roleText ?? '').toUpperCase();
  const role = u?.role;
  const isOps =
    roleText === 'OPERATIONS' ||
    role === 'OPERATIONS' ||
    role === 2;
  const isAdmin = roleText === 'ADMIN' || role === 'ADMIN' || role === 1;

  if (isOps || isAdmin) return true;

  router.navigate(['/auth/forbidden']);
  return false;
};

