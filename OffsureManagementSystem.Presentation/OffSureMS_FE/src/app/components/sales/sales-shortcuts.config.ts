import { HeaderShortcut } from 'app/shared/models/header-shortcut.model';

/** Sales portal quick shortcuts (header grid dropdown). */
export const SALES_HEADER_SHORTCUTS: HeaderShortcut[] = [
  {
    title: 'nav.shortcuts.sales.dashboard',
    icon: 'ti-home',
    action: 'navigate',
    path: '/sales/dashboard',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.sales.browseTeam',
    icon: 'ti-id-badge',
    action: 'navigate',
    path: '/sales/team-members',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.sales.addClient',
    icon: 'ti-plus',
    action: 'modal',
    modalKey: 'sales-client-create',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.sales.clients',
    icon: 'ti-briefcase',
    action: 'navigate',
    path: '/sales/clients',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.sales.projects',
    icon: 'ti-folder',
    action: 'navigate',
    path: '/sales/projects',
    alwaysEnabled: true,
  },
];
