import { HeaderShortcut } from 'app/shared/models/header-shortcut.model';

/** Team portal quick shortcuts (header grid dropdown). */
export const TEAM_HEADER_SHORTCUTS: HeaderShortcut[] = [
  {
    title: 'nav.shortcuts.team.dashboard',
    icon: 'ti-home',
    action: 'navigate',
    path: '/team/dashboard',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.team.projects',
    icon: 'ti-briefcase',
    action: 'navigate',
    path: '/team/projects',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.team.profile',
    icon: 'ti-user',
    action: 'navigate',
    path: '/team/profile',
    alwaysEnabled: true,
  },
];
