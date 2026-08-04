import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Route, Router, RouterStateSnapshot, UrlSegment } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> {
    const minRoleLevel = (route.data['roleLevel'] as number) || 0;
    return this.checkAuthentication(state.url, minRoleLevel);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> {
    const minRoleLevel = (route.data['roleLevel'] as number) || 0;
    return this.checkAuthentication(state.url, minRoleLevel);
  }

  canLoad(route: Route, segments: UrlSegment[]): boolean | Observable<boolean> {
    const minRoleLevel = (route.data?.['roleLevel'] as number) || 0;
    return this.checkAuthentication(route.path || '', minRoleLevel);
  }

  private checkAuthentication(redirectUrl: string, _minRoleLevel: number): Observable<boolean> {
    if (this.authService.isAuthenticated()) {
      return of(true);
    }

    // Access token may be expired while refresh is still valid — try to recover.
    return this.authService.ensureSession().pipe(
      map(ok => {
        if (!ok) {
          this.router.navigate(['/auth/login'], { queryParams: { returnUrl: redirectUrl } });
          return false;
        }
        return true;
      })
    );
  }
}
