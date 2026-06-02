import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BreadcrumbService } from 'app/core/services/breadcrumb.service';
import { BreadcrumbItem } from 'app/shared/models/breadcrumb-item.model';
import { BREADCRUMB_ROUTES } from 'app/shared/routes/breadcrumb.routes';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-page-header',
  imports: [CommonModule, TranslateModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
})
export class PageHeaderComponent implements OnInit, OnDestroy {
  /** Page heading (h2). Falls back to route title / activeitem when empty. */
  @Input() title = '';
  /** Manual breadcrumb trail. Leave empty to use router-based history. */
  @Input() title1: BreadcrumbItem[] = [];
  /** Active page label when not using route title. */
  @Input() activeitem = '';
  /** When true, always build crumbs from the current route. */
  @Input() autoBreadcrumbs = false;

  breadcrumbs: BreadcrumbItem[] = [];
  displayTitle = '';
  private routePageTitle = '';

  private readonly destroy$ = new Subject<void>();
  private readonly crumbRoutes = BREADCRUMB_ROUTES;

  constructor(
    private router: Router,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    if (this.shouldUseAutoBreadcrumbs()) {
      this.breadcrumbService.breadcrumbs$
        .pipe(takeUntil(this.destroy$))
        .subscribe(crumbs => {
          this.breadcrumbs = crumbs;
          this.updateDisplayTitle();
        });

      this.breadcrumbService.pageTitle$
        .pipe(takeUntil(this.destroy$))
        .subscribe(title => {
          this.routePageTitle = title;
          this.updateDisplayTitle();
        });
    } else {
      this.breadcrumbs = this.normalizeManualTrail(this.title1);
      this.updateDisplayTitle();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCrumbLabel(crumb: BreadcrumbItem): string {
    return typeof crumb === 'string' ? crumb : crumb.key;
  }

  isLinkCrumb(crumb: BreadcrumbItem, last: boolean): boolean {
    if (last) {
      return false;
    }
    if (typeof crumb === 'string') {
      return !!this.crumbRoutes[crumb];
    }
    return Array.isArray(crumb.route) && crumb.route.length > 0;
  }

  navigateCrumb(crumb: BreadcrumbItem): void {
    if (typeof crumb === 'string') {
      const route = this.crumbRoutes[crumb];
      if (route) {
        this.router.navigateByUrl(route);
      }
      return;
    }
    if (crumb.route?.length) {
      this.router.navigate(crumb.route);
    }
  }

  private shouldUseAutoBreadcrumbs(): boolean {
    return this.autoBreadcrumbs || this.title1.length === 0;
  }

  private normalizeManualTrail(trail: BreadcrumbItem[]): BreadcrumbItem[] {
    if (!this.activeitem?.trim() || trail.length === 0) {
      return trail;
    }

    const last = trail[trail.length - 1];
    const lastLabel = typeof last === 'string' ? last : last.key;
    if (lastLabel === this.activeitem) {
      return trail;
    }

    return [...trail, this.activeitem];
  }

  private updateDisplayTitle(): void {
    if (this.title?.trim()) {
      this.displayTitle = this.title;
      return;
    }
    if (this.activeitem?.trim()) {
      this.displayTitle = this.activeitem;
      return;
    }
    if (this.routePageTitle?.trim()) {
      this.displayTitle = this.routePageTitle;
      return;
    }
    if (this.breadcrumbs.length > 0) {
      const last = this.breadcrumbs[this.breadcrumbs.length - 1];
      this.displayTitle = typeof last === 'string' ? last : last.key;
      return;
    }
    this.displayTitle = '';
  }
}
