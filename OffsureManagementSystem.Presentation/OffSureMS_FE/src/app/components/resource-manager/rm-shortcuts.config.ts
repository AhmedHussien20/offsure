import { HeaderShortcut } from 'app/shared/models/header-shortcut.model';

/** Resource manager portal quick shortcuts (header grid dropdown). */
export const RM_HEADER_SHORTCUTS: HeaderShortcut[] = [
  {
    title: 'nav.shortcuts.rm.dashboard',
    icon: 'ti-home',
    action: 'navigate',
    path: '/resource-manager/dashboard',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.rm.team',
    icon: 'ti-user',
    action: 'navigate',
    path: '/resource-manager/team',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.rm.projects',
    icon: 'ti-briefcase',
    action: 'navigate',
    path: '/resource-manager/projects',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.rm.profile',
    icon: 'ti-user',
    action: 'navigate',
    path: '/resource-manager/profile',
    alwaysEnabled: true,
  },
];
