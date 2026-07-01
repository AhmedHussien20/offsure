import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { map, switchMap, tap } from 'rxjs/operators';
import * as NavActions from './nav.actions';
import { MenuItem } from '../../shared/models/menu-item.model';
import { forkJoin, Observable, of } from 'rxjs';
import { AuthService } from 'app/core/services/auth.service';

@Injectable()
export class NavEffects {
  initializeMenu$: any;
  updateTranslations$: any;

private ADMIN_MENUITEMS: MenuItem[] = [
  { headTitle: 'Admin Portal' },
  {
    title: 'Dashboard',
    path: '/admin/dashboard',
    type: 'link',
    icon: 'ti-home',
    requiredRole: 'Administrator',
  },
  {
    title: 'Requests',
    path: '/admin/requests',
    type: 'link',
    icon: 'ti-clipboard',
    requiredRole: 'Administrator',
  },
  {
    title: 'Projects',
    path: '/admin/projects',
    type: 'link',
    icon: 'ti-folder',
    requiredRole: 'Administrator',
  },
  {
    title: 'Team',
    path: '/admin/team',
    type: 'link',
    icon: 'ti-user',
    requiredRole: 'Administrator',
  },
  {
    title: 'Resource Managers',
    path: '/admin/resource-managers',
    type: 'link',
    icon: 'ti-id-badge',
    requiredRole: 'Administrator',
  },
  {
    title: 'Sales Users',
    path: '/admin/sales-users',
    type: 'link',
    icon: 'ti-user',
    requiredRole: 'Administrator',
  },
  {
    title: 'Services',
    path: '/admin/services',
    type: 'link',
    icon: 'ti-settings',
    requiredRole: 'Administrator',
  },
  {
    title: 'Skills',
    path: '/admin/skills',
    type: 'link',
    icon: 'ti-star',
    requiredRole: 'Administrator',
  },
  {
    title: 'Portfolio',
    path: '/admin/portfolio',
    type: 'link',
    icon: 'ti-image',
    requiredRole: 'Administrator',
  },
  {
    title: 'Clients',
    path: '/admin/clients',
    type: 'link',
    icon: 'ti-briefcase',
    requiredRole: 'Administrator',
  },
];

private TEAM_MENUITEMS: MenuItem[] = [
  { headTitle: 'Team Portal' },
  {
    title: 'Dashboard',
    path: '/team/dashboard',
    type: 'link',
    icon: 'ti-home',
    requiredRole: 'TeamMember',
  },
  {
    title: 'My Projects',
    path: '/team/projects',
    type: 'link',
    icon: 'ti-folder',
    requiredRole: 'TeamMember',
  },
  // {
  //   title: 'My Profile',
  //   path: '/team/profile',
  //   type: 'link',
  //   icon: 'ti-user',
  //   requiredRole: 'TeamMember',
  // },
];

private RESOURCE_MANAGER_MENUITEMS: MenuItem[] = [
  { headTitle: 'Resource Manager Portal' },
  {
    title: 'Dashboard',
    path: '/resource-manager/dashboard',
    type: 'link',
    icon: 'ti-home',
    requiredRole: 'ResourceManager',
  },
  {
    title: 'My Team',
    path: '/resource-manager/team',
    type: 'link',
    icon: 'ti-user',
    requiredRole: 'ResourceManager',
  },
  {
    title: 'Projects',
    path: '/resource-manager/projects',
    type: 'link',
    icon: 'ti-folder',
    requiredRole: 'ResourceManager',
  },
];

private SALES_MENUITEMS: MenuItem[] = [
  { headTitle: 'Sales Portal' },
  {
    title: 'Dashboard',
    path: '/sales/dashboard',
    type: 'link',
    icon: 'ti-home',
    requiredRole: 'Sales',
  },
  {
    title: 'Team Members',
    path: '/sales/team-members',
    type: 'link',
    icon: 'ti-id-badge',
    requiredRole: 'Sales',
  },
  {
    title: 'My Projects',
    path: '/sales/projects',
    type: 'link',
    icon: 'ti-folder',
    requiredRole: 'Sales',
  },
  {
    title: 'My Clients',
    path: '/sales/clients',
    type: 'link',
    icon: 'ti-briefcase',
    requiredRole: 'Sales',
  },
];

private CLIENT_MENUITEMS: MenuItem[] = [
  { headTitle: 'Client Portal' },
  {
    title: 'Dashboard',
    path: '/client/dashboard',
    type: 'link',
    icon: 'ti-home',
    requiredRole: 'Client',
  },
  {
    title: 'My Requests',
    path: '/client/requests',
    type: 'link',
    icon: 'ti-clipboard',
    requiredRole: 'Client',
  },
  {
    title: 'My Projects',
    path: '/client/projects',
    type: 'link',
    icon: 'ti-folder',
    requiredRole: 'Client',
  },
  {
    title: 'Team Members',
    path: '/client/team-members',
    type: 'link',
    icon: 'ti-id-badge',
    requiredRole: 'Client',
  },
  // {
  //   title: 'Company Profile',
  //   path: '/client/profile',
  //   type: 'link',
  //   icon: 'ti-user',
  //   requiredRole: 'Client',
  // },
];

private MENUITEMS: MenuItem[] = [

  // ================= Dashboard =================
  { headTitle: 'nav.dashboard.header', minRoleLevel: 10 },
  {
    title: 'nav.dashboard.title',
    path: '/dashboard',
    type: 'link',
    icon: 'ti-home',
    minRoleLevel: 10
  },

  // ================= Organization =================
  { headTitle: 'nav.apps.organization.title', minRoleLevel: 100 },
  {
    title: 'nav.apps.organization.title',
    icon: 'ti-map',
    type: 'sub',
    minRoleLevel: 100,
    children: [
      {
        title: 'nav.apps.area.list',
        path: '/area/area-list',
        type: 'link',
        minRoleLevel: 100
      },
      {
        title: 'nav.apps.branch.list',
        path: '/branch/branch-list',
        type: 'link',
        minRoleLevel: 100
      },
      {
        title: 'nav.apps.department.list',
        path: '/department/department-list',
        type: 'link',
        minRoleLevel: 100
      }
    ]
  },

  // ================= Users =================
  { headTitle: 'nav.apps.employee.header', minRoleLevel: 70 },
  {
    title: 'nav.apps.employee.title',
    icon: 'ti-user',
    type: 'sub',
    minRoleLevel: 70,
    children: [
      {
        title: 'nav.apps.employee.list',
        path: '/employee/employee-list',
        type: 'link',
        minRoleLevel: 70
      },
      {
        title: 'nav.apps.role.list',
        path: '/role/role-list',
        type: 'link',
        minRoleLevel: 100
      },
      {
        title: 'nav.apps.permission.list',
        path: '/role/permission-list',
        type: 'link',
        minRoleLevel: 100
      }
    ]
  },

  // ================= Operations =================
  { headTitle: 'nav.apps.operations.header', minRoleLevel: 10 },
  {
    title: 'nav.apps.operations.title',
    icon: 'ti-clipboard',
    type: 'sub',
    minRoleLevel: 10,
    children: [
      {
        title: 'nav.apps.task.list',
        path: '/task/task-list',
        type: 'link',
        minRoleLevel: 10
      },
      {
        title: 'nav.apps.calender.title',
        path: '/utilities/event-calender',
        type: 'link',
        minRoleLevel: 10
      }
    ]
  },

  // ================= Education =================
  { headTitle: 'nav.apps.education.header', minRoleLevel: 50 },
  {
    title: 'nav.apps.education.title',
    icon: 'ti-book',
    type: 'sub',
    minRoleLevel: 50,
    children: [
      {
        title: 'nav.apps.student.list',
        path: '/student/student-list',
        type: 'link',
        minRoleLevel: 50
      },
      {
        title: 'nav.apps.course.list',
        path: '/course/course-list',
        type: 'link',
        minRoleLevel: 50
      },
      {
        title: 'nav.apps.course.offer_list',
        path: '/offer/offer-list',
        type: 'link',
        minRoleLevel: 50
      }
    ]
  },

  { headTitle: 'nav.apps.reports.header', minRoleLevel: 10 },
  {
    title: 'nav.apps.reports.title',
    icon: 'ti-bar-chart',
    type: 'sub',
    minRoleLevel: 10,
    children: [
     {
      title: 'nav.apps.reports.dashboard',
      path: '/report/reports-dashboard',
      type: 'link',
      minRoleLevel: 10
    }
    ]
  },

  { headTitle: 'nav.apps.leaves.header', minRoleLevel: 10 },
  {
    title: 'nav.apps.leaves.title',
    icon: 'ti-calendar',
    type: 'sub',
    minRoleLevel: 10,
    children: [
      {
        title: 'nav.apps.leaves.leaves_type',
        path: '/leave/leave-type-list',
        type: 'link',
        minRoleLevel: 50
      },
      {
        title: 'nav.apps.leaves.Leaves_requests',
        path: '/leave/leave-list',
        type: 'link',
        minRoleLevel: 10
      },
    ]
  },

   { headTitle: 'nav.apps.charts.header', minRoleLevel: 10 },
  {
    title: 'nav.apps.charts.title',
    icon: 'ti ti-chart-pie',
    type: 'sub',
    minRoleLevel: 10,
    children: [
      {
        title: 'nav.apps.charts.emp_statistics',
        path: '/charts/emp-charts',
        type: 'link',
        minRoleLevel: 10
      },
      
    ]
  },

];



  // ---- Configurations ----
  // {
  //   title: 'nav.apps.configurations.title',
  //   icon: 'ti-settings',
  //   type: 'sub',
  //   children: [
  //     { title: 'nav.apps.configurations.moduleAvailability', type: 'link', path: '/configuration/modulesAvailabilityList' },
  //     { title: 'nav.apps.configurations.modules', type: 'link', path: '/configuration/modules' },
  //     { title: 'nav.apps.configurations.branches', type: 'link', path: '/configuration/branches' },
  //     { title: 'nav.apps.configurations.onlineOrders', type: 'link' },
  //     { title: 'nav.apps.configurations.externalIntegration', type: 'link' },
  //     { title: 'nav.apps.configurations.notifications', type: 'link' },
  //     { title: 'nav.apps.configurations.campaigns', type: 'link' },
  //     { title: 'nav.apps.configurations.ads', type: 'link' },
  //   ],
  // },
  constructor(private actions$: Actions, private translate: TranslateService, private auth: AuthService) {
    console.log('NavEffects initialized:', this.actions$);

    this.initializeEffects();
  }

  private initializeEffects() {

    this.initializeMenu$ = createEffect(() =>
      this.actions$.pipe(
        ofType(NavActions.initializeMenu),
        switchMap(() => {
          const menuCopy = JSON.parse(JSON.stringify(this.getMenuItemsForCurrentUser()));
          const filteredMenu = this.filterMenuByAccess(menuCopy);

          return forkJoin(
            filteredMenu.map(item => this.translateMenuItem(item))
          );
        }),
        map(items => NavActions.updateMenuItems({ items }))
      )
    );


    this.updateTranslations$ = createEffect(() =>
      this.actions$.pipe(
        ofType(NavActions.updateMenuTranslations),
        switchMap(() => {
          const menuCopy = JSON.parse(JSON.stringify(this.getMenuItemsForCurrentUser()));
          const filteredMenu = this.filterMenuByAccess(menuCopy);
          return forkJoin(
            filteredMenu.map(item => this.translateMenuItem(item))
          );
        }),
        map(translatedMenu =>
          NavActions.updateMenuItems({ items: translatedMenu })
        )
      )
    );

  }


  private filterMenuByAccess(items: MenuItem[]): MenuItem[] {
    return items
      .filter(item => this.canShow(item))
      .map(item => ({
        ...item,
        children: item.children
          ? this.filterMenuByAccess(item.children)
          : undefined
      }))
      .filter(item =>
        item.type !== 'sub' ||
        (item.children && item.children.length > 0)
      );
  }

  private getMenuItemsForCurrentUser(): MenuItem[] {
    if (this.auth.isClient()) {
      return this.CLIENT_MENUITEMS;
    }
    if (this.auth.isTeamMember()) {
      return this.TEAM_MENUITEMS;
    }
    if (this.auth.isResourceManager()) {
      return this.RESOURCE_MANAGER_MENUITEMS;
    }
    if (this.auth.isSales()) {
      return this.SALES_MENUITEMS;
    }
    if (this.auth.isAdministrator()) {
      return this.ADMIN_MENUITEMS;
    }
    return this.MENUITEMS;
  }

  private canShow(item: MenuItem): boolean {
    const user = this.auth.getUser() ?? this.auth.getCurrentUser();
    if (!user) return false;

    const roleName = String((user as any).role ?? (user as any).roleLevelName ?? '').trim();
    if (item.requiredRole && roleName.toLowerCase() !== item.requiredRole.toLowerCase()) {
      return false;
    }

    if (item.minRoleLevel !== undefined) {
      const roleLevel = (user as any).roleLevel;
      if (roleLevel == null || roleLevel < item.minRoleLevel) {
        return false;
      }
    }

    if (
      item.requiredPermission &&
      (!(user as any).permissions || !(user as any).permissions.includes(item.requiredPermission))
    ) {
      return false;
    }

    return true;
  }



  private translateMenuItem(item: MenuItem): Observable<MenuItem> {
    if (!item) {
      return of({ headTitle: '', title: '', children: [] }); // Ensure we always return a valid MenuItem
    }

    return this.translate.get([item.title || '', item.headTitle || '']).pipe(
      switchMap((translations) => {
        const newItem: MenuItem = { ...item };

        newItem.title = translations[item.title || ''] || item.title || '';
        newItem.headTitle =
          translations[item.headTitle || ''] || item.headTitle || '';

        if (item.children && item.children.length > 0) {
          return forkJoin(
            item.children.map((child) => this.translateMenuItem(child))
          ).pipe(
            map((translatedChildren) => {
              newItem.children = translatedChildren;
              return newItem;
            })
          );
        }

        return of(newItem);
      })
    );
  }
}
