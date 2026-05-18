export interface MenuItem {
  path?: string;
  title?: string;
  headTitle?: string;
  icon?: string;
  type?: string;
  active?: boolean;
  selected?: boolean;
  dirchange?: boolean;
  menutype?: string;
  children?: MenuItem[];
  
  minRoleLevel?: number;
  requiredPermission?: string;
  /** When set, menu row is shown only if user's JWT/profile role matches (e.g. OPERATIONS). */
  requiredRole?: string;
  /** Hide for administration portal users (`type=system`). */
  customerPortalOnly?: boolean;
  /** Show only for administration portal users (internal staff JWT). */
  requiresSystemPortal?: boolean;

  /** Optional nav badge (e.g. pending approvals). */
  badgeCount?: number;
}
