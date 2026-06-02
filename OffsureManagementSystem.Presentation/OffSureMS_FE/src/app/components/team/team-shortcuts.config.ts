import { HeaderShortcut } from 'app/shared/models/header-shortcut.model';

/** Team portal quick shortcuts (header grid dropdown). */
export const TEAM_HEADER_SHORTCUTS: HeaderShortcut[] = [
  {
    title: 'nav.shortcuts.team.dashboard',
    icon: 'ti-home',
    path: '/team/dashboard',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.team.projects',
    icon: 'ti-briefcase',
    path: '/team/projects',
    alwaysEnabled: true,
  },
  {
    title: 'nav.shortcuts.team.profile',
    icon: 'ti-user',
    path: '/team/profile',
    alwaysEnabled: true,
  },
];
