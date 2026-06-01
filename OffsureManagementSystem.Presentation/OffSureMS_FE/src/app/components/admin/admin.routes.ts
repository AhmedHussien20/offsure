import { Routes } from '@angular/router';
import { adminRoleGuard } from 'app/core/auth/admin-role.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [adminRoleGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./admin-requests-list/admin-requests-list.component').then(m => m.AdminRequestsListComponent),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./admin-projects-list/admin-projects-list.component').then(m => m.AdminProjectsListComponent),
      },
      {
        path: 'projects/:id',
        loadComponent: () =>
          import('./admin-project-detail/admin-project-detail.component').then(m => m.AdminProjectDetailComponent),
      },
      {
        path: 'team',
        loadComponent: () =>
          import('./admin-team-list/admin-team-list.component').then(m => m.AdminTeamListComponent),
      },
      {
        path: 'team/new',
        loadComponent: () =>
          import('./admin-team-form/admin-team-form.component').then(m => m.AdminTeamFormComponent),
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./admin-services/admin-services.component').then(m => m.AdminServicesComponent),
      },
      {
        path: 'portfolio',
        loadComponent: () =>
          import('./admin-portfolios-list/admin-portfolios-list.component').then(m => m.AdminPortfoliosListComponent),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./admin-clients-list/admin-clients-list.component').then(m => m.AdminClientsListComponent),
      },
    ],
  },
];
