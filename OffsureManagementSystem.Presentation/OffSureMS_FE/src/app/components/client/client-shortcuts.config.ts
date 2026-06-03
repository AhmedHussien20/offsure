import { HeaderShortcut } from 'app/shared/models/header-shortcut.model';

/** Client portal quick shortcuts (header grid dropdown). */
export const CLIENT_HEADER_SHORTCUTS: HeaderShortcut[] = [
  {
    title: 'nav.shortcuts.client.newRequest',
    icon: 'ti-plus',
    action: 'modal',
    modalKey: 'client-request-create',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.client.requests',
    icon: 'ti-clipboard',
    action: 'navigate',
    path: '/client/requests',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.client.projects',
    icon: 'ti-briefcase',
    action: 'navigate',
    path: '/client/projects',
    alwaysEnabled: true,
  },
];
