import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BreadcrumbItem } from 'app/shared/models/breadcrumb-item.model';
import { BREADCRUMB_ROUTES } from 'app/shared/routes/breadcrumb.routes';

@Component({
  selector: 'app-page-header', 
  imports: [CommonModule, TranslateModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent {
  @Input() title: string = '';
  /** Each item is a translation key or `{ key, route }` for dynamic router links */
  @Input() title1: BreadcrumbItem[] = [];  
  @Input() activeitem: string = '';  
  crumbRoutes = BREADCRUMB_ROUTES;

  constructor(private router: Router) {}

  getCrumbLabel(crumb: BreadcrumbItem): string {
    return typeof crumb === 'string' ? crumb : crumb.key;
  }

  hasCrumbLink(crumb: BreadcrumbItem, last: boolean): boolean {
    if (last) return false;
    if (typeof crumb === 'string') return !!this.crumbRoutes[crumb];
    return Array.isArray(crumb.route) && crumb.route.length > 0;
  }

  navigateCrumb(crumb: BreadcrumbItem): void {
    if (typeof crumb === 'string') {
      const route = this.crumbRoutes[crumb];
      if (route) this.router.navigate([route]);
      return;
    }
    if (crumb.route?.length) this.router.navigate(crumb.route);
  }
}
