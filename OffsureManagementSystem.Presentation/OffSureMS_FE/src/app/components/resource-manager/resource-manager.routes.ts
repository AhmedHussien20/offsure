import { Routes } from '@angular/router';
import { resourceManagerRoleGuard } from 'app/core/auth/resource-manager-role.guard';

export const resourceManagerRoutes: Routes = [
  {
    path: '',
    canActivate: [resourceManagerRoleGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard', title: 'Dashboard' },
        loadComponent: () =>
          import('./rm-dashboard/rm-dashboard.component').then(m => m.RmDashboardComponent),
      },
      {
        path: 'team',
        data: { breadcrumb: 'My Team', title: 'My Team' },
        loadComponent: () =>
          import('./rm-team-list/rm-team-list.component').then(m => m.RmTeamListComponent),
      },
      {
        path: 'projects',
        data: { breadcrumb: 'Projects', title: 'Projects' },
        loadComponent: () =>
          import('./rm-projects-list/rm-projects-list.component').then(m => m.RmProjectsListComponent),
      },
      {
        path: 'projects/:id/timesheet-report',
        data: {
          breadcrumb: 'Hours & costs',
          title: 'Hours & costs',
          breadcrumbParents: [{ key: 'Projects', route: ['resource-manager', 'projects'] }],
          portal: 'rm',
        },
        loadComponent: () =>
          import('../admin/admin-project-detail/admin-timesheet-report.component').then(
            m => m.AdminTimesheetReportComponent
          ),
      },
      {
        path: 'projects/:id',
        data: {
          breadcrumb: 'Project Details',
          title: 'Project Details',
          breadcrumbParents: [{ key: 'Projects', route: ['resource-manager', 'projects'] }],
        },
        loadComponent: () =>
          import('./rm-project-detail/rm-project-detail.component').then(m => m.RmProjectDetailComponent),
      },
      {
        path: 'profile',
        data: { breadcrumb: false, title: 'My Profile', hidePageHeader: true },
        loadComponent: () =>
          import('./rm-profile/rm-profile.component').then(m => m.RmProfileComponent),
      },
    ],
  },
];
