import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class DomainGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot
  ): boolean | UrlTree {

    const hostname = window.location.hostname.toLowerCase();

    const isAdminDomain = hostname.startsWith('admin.');
    const isLocalhost = hostname === 'localhost';

    if (isLocalhost) {
      return true;
    }

    const currentPath = route.routeConfig?.path;

    if (isAdminDomain) {

      if (currentPath === 'admin/login') {
        return true;
      }

      return this.router.createUrlTree([
        '/auth/admin/login'
      ]);
    }

    else {

      if (currentPath === 'admin/login') {
        return this.router.createUrlTree([
          '/auth/login'
        ]);
      }

      return true;
    }
  }
}