export interface User {
  userId: number;
  token?: string;

  /** `customer` (portal user) vs `system` (administration portal staff). */
  type?: 'customer' | 'system';

  // Backend auth payload (NPE AuthController)
  customerId?: number;
  role?: string | number;
  roleText?: string;
  forcePasswordChange?: boolean;

  /** System portal: assigned roles from JWT (ADMIN, OPERATIONS, SUPPORT). */
  roles?: string[];

  /** Used by sidebar filtering (customer portal). */
  roleLevel?: number;

  // Legacy / optional profile fields used in some UI screens
  fullName?: string;
  email?: string;
  password?: string;
  companyId?: number;
  departmentId?: number;
  jobId?: number;
  title?: string;
  nationality?: string;
  identityNumber?: string;
  mobile?: string;
  address?: string;
  qualification?: string;
  isActive?: boolean;
  permissions?: any[];
}
