import { HeaderShortcut } from 'app/shared/models/header-shortcut.model';

/** Client portal quick shortcuts (header grid dropdown). */
export const CLIENT_HEADER_SHORTCUTS: HeaderShortcut[] = [
  {
    title: 'nav.shortcuts.client.newRequest',
    icon: 'ti-plus',
    path: '/client/requests?new=1',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.client.requests',
    icon: 'ti-clipboard',
    path: '/client/requests',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.client.projects',
    icon: 'ti-briefcase',
    path: '/client/projects',
    alwaysEnabled: true,
  }
  
];
