import { Routes } from '@angular/router';
import { teamRoleGuard } from 'app/core/auth/team-role.guard';

export const teamRoutes: Routes = [
  {
    path: '',
    canActivate: [teamRoleGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard', title: 'Dashboard' },
        loadComponent: () =>
          import('./team-dashboard/team-dashboard.component').then(m => m.TeamDashboardComponent),
      },
      {
        path: 'projects',
        data: { breadcrumb: 'My Projects', title: 'My Projects' },
        loadComponent: () =>
          import('./team-projects-list/team-projects-list.component').then(m => m.TeamProjectsListComponent),
      },
      {
        path: 'projects/:id/timesheet',
        data: {
          breadcrumb: 'Daily timesheet',
          title: 'Log time',
          breadcrumbParents: [{ key: 'My Projects', route: ['team', 'projects'] }],
        },
        loadComponent: () =>
          import('./team-daily-timesheet/team-daily-timesheet.component').then(
            m => m.TeamDailyTimesheetComponent
          ),
      },
      {
        path: 'projects/:id/timesheet-report',
        data: {
          breadcrumb: 'My logged hours',
          title: 'My logged hours',
          breadcrumbParents: [{ key: 'My Projects', route: ['team', 'projects'] }],
          portal: 'team',
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
          breadcrumbParents: [{ key: 'My Projects', route: ['team', 'projects'] }],
        },
        loadComponent: () =>
          import('./team-project-detail/team-project-detail.component').then(m => m.TeamProjectDetailComponent),
      },
      {
        path: 'profile',
        data: { breadcrumb: 'Profile', title: 'Profile' },
        loadComponent: () =>
          import('./team-profile/team-profile.component').then(m => m.TeamProfileComponent),
      },
    ],
  },
];
