import { Routes } from '@angular/router';
import { clientRoleGuard } from 'app/core/auth/client-role.guard';

export const clientRoutes: Routes = [
  {
    path: '',
    canActivate: [clientRoleGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard', title: 'Dashboard' },
        loadComponent: () =>
          import('./client-dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent),
      },
      {
        path: 'requests',
        data: { breadcrumb: 'My Requests', title: 'My Requests' },
        loadComponent: () =>
          import('./client-requests-list/client-requests-list.component').then(m => m.ClientRequestsListComponent),
      },
      {
        path: 'projects',
        data: { breadcrumb: 'My Projects', title: 'My Projects' },
        loadComponent: () =>
          import('./client-projects-list/client-projects-list.component').then(m => m.ClientProjectsListComponent),
      },
      {
        path: 'projects/:id',
        data: {
          breadcrumb: 'Project Details',
          title: 'Project Details',
          breadcrumbParents: [{ key: 'My Projects', route: ['client', 'projects'] }],
        },
        loadComponent: () =>
          import('./client-project-detail/client-project-detail.component').then(m => m.ClientProjectDetailComponent),
      },
      {
        path: 'profile',
        data: { breadcrumb: 'Profile', title: 'Profile' },
        loadComponent: () =>
          import('./client-profile/client-profile.component').then(m => m.ClientProfileComponent),
      },
    ],
  },
];
