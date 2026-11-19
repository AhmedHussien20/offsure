import { Routes } from '@angular/router';
import { viewerRoleGuard } from 'app/core/auth/viewer-role.guard';

export const viewerRoutes: Routes = [
  {
    path: '',
    canActivate: [viewerRoleGuard],
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      {
        path: 'projects',
        data: { breadcrumb: 'Projects', title: 'Projects' },
        loadComponent: () =>
          import('./viewer-projects-list/viewer-projects-list.component').then(
            m => m.ViewerProjectsListComponent
          ),
      },
      {
        path: 'projects/:id',
        data: {
          breadcrumb: 'Project Details',
          title: 'Project Details',
          breadcrumbParents: [{ key: 'Projects', route: ['viewer', 'projects'] }],
        },
        loadComponent: () =>
          import('./viewer-project-detail/viewer-project-detail.component').then(
            m => m.ViewerProjectDetailComponent
          ),
      },
      {
        path: 'requests',
        data: { breadcrumb: 'Requests', title: 'Requests' },
        loadComponent: () =>
          import('./viewer-requests-list/viewer-requests-list.component').then(
            m => m.ViewerRequestsListComponent
          ),
      },
      {
        path: 'companies',
        data: { breadcrumb: 'Companies', title: 'Companies' },
        loadComponent: () =>
          import('./viewer-clients-list/viewer-clients-list.component').then(
            m => m.ViewerClientsListComponent
          ),
      },
      {
        path: 'companies/:id',
        data: {
          breadcrumb: 'Company Details',
          title: 'Company Details',
          breadcrumbParents: [{ key: 'Companies', route: ['viewer', 'companies'] }],
        },
        loadComponent: () =>
          import('./viewer-clients-list/viewer-client-organization.component').then(
            m => m.ViewerClientOrganizationComponent
          ),
      },
      {
        path: 'client-members',
        data: { breadcrumb: 'All Client Members', title: 'All Client Members' },
        loadComponent: () =>
          import('./viewer-clients-list/viewer-client-members-list.component').then(
            m => m.ViewerClientMembersListComponent
          ),
      },
    ],
  },
];
