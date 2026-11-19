import { HeaderShortcut } from 'app/shared/models/header-shortcut.model';

/** Viewer portal quick shortcuts (read-only header grid dropdown). */
export const VIEWER_HEADER_SHORTCUTS: HeaderShortcut[] = [
  {
    title: 'Projects',
    icon: 'ti-folder',
    action: 'navigate',
    path: '/viewer/projects',
    alwaysEnabled: true,
  },
  {
    title: 'Requests',
    icon: 'ti-clipboard',
    action: 'navigate',
    path: '/viewer/requests',
    alwaysEnabled: true,
  },
  {
    title: 'Companies',
    icon: 'ti-briefcase',
    action: 'navigate',
    path: '/viewer/companies',
    alwaysEnabled: true,
  },
  {
    title: 'All Client Members',
    icon: 'ti-id-badge',
    action: 'navigate',
    path: '/viewer/client-members',
    alwaysEnabled: true,
  },
];
