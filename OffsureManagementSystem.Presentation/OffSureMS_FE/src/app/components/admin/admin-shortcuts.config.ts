import { HeaderShortcut } from 'app/shared/models/header-shortcut.model';

/** Admin portal quick shortcuts (header grid dropdown). */
export const ADMIN_HEADER_SHORTCUTS: HeaderShortcut[] = [
  {
    title: 'nav.shortcuts.admin.addTeamMember',
    icon: 'ti-user',
    action: 'modal',
    modalKey: 'admin-team-create',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.admin.reviewRequests',
    icon: 'ti-clipboard',
    action: 'navigate',
    path: '/admin/requests',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.admin.addService',
    icon: 'ti-settings',
    action: 'modal',
    modalKey: 'admin-service-create',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.admin.addPortfolio',
    icon: 'ti-image',
    action: 'modal',
    modalKey: 'admin-portfolio-create',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.admin.teamList',
    icon: 'ti-id-badge',
    action: 'navigate',
    path: '/admin/team',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.admin.servicesList',
    icon: 'ti-menu-alt',
    action: 'navigate',
    path: '/admin/services',
    alwaysEnabled: true,
  },
];
