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
        data: { breadcrumb: 'Dashboard', title: 'Dashboard' },
        loadComponent: () =>
          import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'requests',
        data: { breadcrumb: 'Requests', title: 'Requests' },
        loadComponent: () =>
          import('./admin-requests-list/admin-requests-list.component').then(m => m.AdminRequestsListComponent),
      },
      {
        path: 'projects',
        data: { breadcrumb: 'Projects', title: 'Projects' },
        loadComponent: () =>
          import('./admin-projects-list/admin-projects-list.component').then(m => m.AdminProjectsListComponent),
      },
      {
        path: 'projects/:id',
        data: {
          breadcrumb: 'Project Details',
          title: 'Project Details',
          breadcrumbParents: [{ key: 'Projects', route: ['admin', 'projects'] }],
        },
        loadComponent: () =>
          import('./admin-project-detail/admin-project-detail.component').then(m => m.AdminProjectDetailComponent),
      },
      {
        path: 'team',
        data: { breadcrumb: 'Team', title: 'Team' },
        loadComponent: () =>
          import('./admin-team-list/admin-team-list.component').then(m => m.AdminTeamListComponent),
      },
      {
        path: 'team/new',
        data: {
          breadcrumb: 'Add Member',
          title: 'Add Team Member',
          breadcrumbParents: [{ key: 'Team', route: ['admin', 'team'] }],
        },
        loadComponent: () =>
          import('./admin-team-form/admin-team-form.component').then(m => m.AdminTeamFormComponent),
      },
      {
        path: 'services',
        data: { breadcrumb: 'Services', title: 'Services' },
        loadComponent: () =>
          import('./admin-services/admin-services.component').then(m => m.AdminServicesComponent),
      },
      {
        path: 'skills',
        data: { breadcrumb: 'Skills', title: 'Skills' },
        loadComponent: () =>
          import('./admin-skills/admin-skills.component').then(m => m.AdminSkillsComponent),
      },
      {
        path: 'portfolio',
        data: { breadcrumb: 'Portfolio', title: 'Portfolio' },
        loadComponent: () =>
          import('./admin-portfolios-list/admin-portfolios-list.component').then(m => m.AdminPortfoliosListComponent),
      },
      {
        path: 'clients',
        data: { breadcrumb: 'Clients', title: 'Clients' },
        loadComponent: () =>
          import('./admin-clients-list/admin-clients-list.component').then(m => m.AdminClientsListComponent),
      },
    ],
  },
];
