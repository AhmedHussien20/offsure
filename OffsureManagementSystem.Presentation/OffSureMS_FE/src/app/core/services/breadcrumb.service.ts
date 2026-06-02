import { Injectable } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';
import { BreadcrumbItem } from 'app/shared/models/breadcrumb-item.model';

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly breadcrumbsSubject = new BehaviorSubject<BreadcrumbItem[]>([]);
  private readonly pageTitleSubject = new BehaviorSubject<string>('');

  readonly breadcrumbs$ = this.breadcrumbsSubject.asObservable();
  readonly pageTitle$ = this.pageTitleSubject.asObservable();

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.refreshFromRouter());

    this.refreshFromRouter();
  }

  /** Override the current (last) breadcrumb label — e.g. project name on detail pages. */
  setDynamicLabel(label: string): void {
    const trimmed = label?.trim();
    if (!trimmed) {
      return;
    }

    const crumbs = [...this.breadcrumbsSubject.value];
    if (crumbs.length === 0) {
      this.pageTitleSubject.next(trimmed);
      return;
    }

    const last = crumbs[crumbs.length - 1];
    crumbs[crumbs.length - 1] =
      typeof last === 'string' ? trimmed : { ...last, key: trimmed };
    this.breadcrumbsSubject.next(crumbs);
    this.pageTitleSubject.next(trimmed);
  }

  private refreshFromRouter(): void {
    const root = this.router.routerState.root;
    const crumbs = this.buildTrail(root);
    this.breadcrumbsSubject.next(crumbs);
    this.pageTitleSubject.next(this.resolvePageTitle(root, crumbs));
  }

  private buildTrail(route: ActivatedRoute, url = '', crumbs: BreadcrumbItem[] = []): BreadcrumbItem[] {
    const children = route.children;
    if (!children.length) {
      return crumbs;
    }

    for (const child of children) {
      const segments = child.snapshot.url.map(segment => segment.path).filter(Boolean);
      if (segments.length) {
        url += `/${segments.join('/')}`;
      }

      const routeData = child.routeConfig?.data;
      const parents = routeData?.['breadcrumbParents'] as BreadcrumbItem[] | undefined;
      if (parents?.length) {
        crumbs.push(...parents);
      }

      // Use routeConfig.data only — snapshot.data inherits parent crumbs and causes Admin/Admin/… duplicates.
      const label = routeData?.['breadcrumb'];
      if (label !== undefined && label !== null && label !== false) {
        const routeCommands = url.split('/').filter(Boolean);
        crumbs.push({
          key: String(label),
          route: routeCommands.length ? routeCommands : [],
        });
      }

      return this.buildTrail(child, url, crumbs);
    }

    return crumbs;
  }

  private resolvePageTitle(route: ActivatedRoute, crumbs: BreadcrumbItem[]): string {
    let deepestTitle = '';
    let node: ActivatedRoute | null = route;

    while (node?.firstChild) {
      node = node.firstChild;
      const title = node.routeConfig?.data?.['title'];
      if (title) {
        deepestTitle = String(title);
      }
    }

    if (deepestTitle) {
      return deepestTitle;
    }

    if (crumbs.length === 0) {
      return '';
    }

    const last = crumbs[crumbs.length - 1];
    return typeof last === 'string' ? last : last.key;
  }
}
