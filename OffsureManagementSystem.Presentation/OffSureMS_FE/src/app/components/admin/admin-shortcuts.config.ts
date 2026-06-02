import { HeaderShortcut } from 'app/shared/models/header-shortcut.model';

/** Admin portal quick shortcuts (header grid dropdown). */
export const ADMIN_HEADER_SHORTCUTS: HeaderShortcut[] = [
  {
    title: 'nav.shortcuts.admin.addTeamMember',
    icon: 'ti-user',
    path: '/admin/team/new',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.admin.reviewRequests',
    icon: 'ti-clipboard',
    path: '/admin/requests',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.admin.addService',
    icon: 'ti-settings',
    path: '/admin/services',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.admin.addPortfolio',
    icon: 'ti-image',
    path: '/admin/portfolio',
    alwaysEnabled: true,
  },
];
