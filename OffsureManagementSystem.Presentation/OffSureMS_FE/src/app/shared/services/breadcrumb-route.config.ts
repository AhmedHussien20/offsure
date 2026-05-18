import { ActivatedRouteSnapshot } from '@angular/router';

export interface BreadcrumbConfig {
  /** Map a URL segment to a translation key or a function that resolves the label */
  segmentLabels: Record<string, string | ((snapshot: ActivatedRouteSnapshot) => string)>;
  /** Each portal's root: the URL prefix and its root crumb key */
  portals: {
    prefix: string;
    /** Route to navigate when clicking the root crumb */
    rootRoute: string;
    /** Translation key for the root crumb */
    rootLabel: string;
    /** Segment to skip in URL (e.g. 'dashboard' is the root itself) */
    skipRootSegment?: string;
  }[];
}

export const BREADCRUMB_CONFIG: BreadcrumbConfig = {
  segmentLabels: {
    // Customer Portal
    'customer': 'Home',
    'home': 'Home',
    'batch': 'Batches',
    'list': 'Batch list',
    'create': 'Create batch',
    'details': 'Batch details',
    'upload': 'Upload batch',

    // Admin Portal
    'admin': 'Admin',
    'dashboard': 'Admin dashboard',
    'approvals': 'Approvals',
    'customers': 'Customers',
    'new': 'Create',
    'users': 'Customer users',

    // Ops Portal
    'ops': 'Operations',
    'batches': 'Batches',
    'dead-letter': 'Dead-letter queue',
    'reconciliation': 'Reconciliation',
    
    // مثال على استخدام دالة ديناميكية
    'profile': (snapshot: ActivatedRouteSnapshot) => {
      const userId = snapshot.params['id'];
      return userId ? `User ${userId}` : 'Profile';
    }
  },

  portals: [
    {
      prefix: '/customer',
      rootRoute: '/customer/home',
      rootLabel: 'Home',
      skipRootSegment: 'home',
    },
    {
      prefix: '/admin',
      rootRoute: '/admin/dashboard',
      rootLabel: 'Admin',
      skipRootSegment: 'dashboard',
    },
    {
      prefix: '/ops', // تم تصحيح: إضافة slash
      rootRoute: '/ops/dashboard',
      rootLabel: 'Operations',
      skipRootSegment: 'dashboard',
    },
  ],
};