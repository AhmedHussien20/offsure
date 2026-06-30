import { Routes } from '@angular/router';
import { salesRoleGuard } from 'app/core/auth/sales-role.guard';

export const salesRoutes: Routes = [
  {
    path: '',
    canActivate: [salesRoleGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard', title: 'Dashboard' },
        loadComponent: () =>
          import('./sales-dashboard/sales-dashboard.component').then(m => m.SalesDashboardComponent),
      },
      {
        path: 'team-members',
        data: { breadcrumb: 'Team Members', title: 'Browse Team Members' },
        loadComponent: () =>
          import('./sales-team-members-list/sales-team-members-list.component').then(
            m => m.SalesTeamMembersListComponent
          ),
      },
      {
        path: 'projects',
        data: { breadcrumb: 'My Projects', title: 'My Projects' },
        loadComponent: () =>
          import('./sales-projects-list/sales-projects-list.component').then(m => m.SalesProjectsListComponent),
      },
      {
        path: 'clients',
        data: { breadcrumb: 'My Clients', title: 'My Clients' },
        loadComponent: () =>
          import('./sales-clients-list/sales-clients-list.component').then(m => m.SalesClientsListComponent),
      },
    ],
  },
];
