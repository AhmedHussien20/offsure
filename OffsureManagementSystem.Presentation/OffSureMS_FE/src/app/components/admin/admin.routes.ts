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
        path: 'projects/:id/timesheet-report',
        data: {
          breadcrumb: 'Hours & costs',
          title: 'Hours & costs',
          breadcrumbParents: [{ key: 'Projects', route: ['admin', 'projects'] }],
          portal: 'admin',
        },
        loadComponent: () =>
          import('./admin-project-detail/admin-timesheet-report.component').then(
            m => m.AdminTimesheetReportComponent
          ),
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
        path: 'resource-managers',
        data: { breadcrumb: 'Resource Managers', title: 'Resource Managers' },
        loadComponent: () =>
          import('./admin-resource-managers-list/admin-resource-managers-list.component').then(
            m => m.AdminResourceManagersListComponent
          ),
      },
      {
        path: 'sales-users',
        data: { breadcrumb: 'Sales Users', title: 'Sales Users' },
        loadComponent: () =>
          import('./admin-sales-users-list/admin-sales-users-list.component').then(
            m => m.AdminSalesUsersListComponent
          ),
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
        path: 'landing-content',
        data: { breadcrumb: 'Landing Content', title: 'Landing Content' },
        loadComponent: () =>
          import('./admin-landing-content/admin-landing-content.component').then(
            m => m.AdminLandingContentComponent
          ),
      },
      {
        path: 'companies',
        data: { breadcrumb: 'Companies', title: 'Companies' },
        loadComponent: () =>
          import('./admin-clients-list/admin-clients-list.component').then(m => m.AdminClientsListComponent),
      },
      {
        path: 'companies/:id',
        data: {
          breadcrumb: 'Company',
          title: 'Company',
          breadcrumbParents: [{ key: 'Companies', route: ['admin', 'companies'] }],
        },
        loadComponent: () =>
          import('./admin-clients-list/admin-client-organization.component').then(
            m => m.AdminClientOrganizationComponent
          ),
      },
      { path: 'clients', redirectTo: 'companies', pathMatch: 'full' },
      { path: 'clients/:id', redirectTo: 'companies/:id' },
      {
        path: 'client-members',
        data: { breadcrumb: 'All Client Members', title: 'All Client Members' },
        loadComponent: () =>
          import('./admin-clients-list/admin-client-members-list.component').then(
            m => m.AdminClientMembersListComponent
          ),
      },
      {
        path: 'profile',
        data: { breadcrumb: false, title: 'My Profile', hidePageHeader: true },
        loadComponent: () =>
          import('./admin-profile/admin-profile.component').then(m => m.AdminProfileComponent),
      },
    ],
  },
];
