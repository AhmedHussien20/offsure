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
        loadComponent: () =>
          import('./client-dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent),
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./client-requests-list/client-requests-list.component').then(m => m.ClientRequestsListComponent),
      },
      {
        path: 'requests/new',
        loadComponent: () =>
          import('./client-request-form/client-request-form.component').then(m => m.ClientRequestFormComponent),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./client-projects-list/client-projects-list.component').then(m => m.ClientProjectsListComponent),
      },
      {
        path: 'projects/:id',
        loadComponent: () =>
          import('./client-project-detail/client-project-detail.component').then(m => m.ClientProjectDetailComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../pages/profile/profile.component').then(m => m.ProfileComponent),
        data: { clientPortal: true },
      },
    ],
  },
];
