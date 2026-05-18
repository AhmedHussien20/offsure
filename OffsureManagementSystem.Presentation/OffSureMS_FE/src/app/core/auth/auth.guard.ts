import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Route, Router, RouterStateSnapshot, UrlSegment } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}


  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> {
 const minRoleLevel = route.data['roleLevel'] as number || 0;
    return this.checkAuthentication(state.url, minRoleLevel);  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const minRoleLevel = route.data['roleLevel'] as number || 0;
    return this.checkAuthentication(state.url, minRoleLevel);
  }

  canLoad(route: Route, segments: UrlSegment[]): boolean {
    const minRoleLevel = route.data?.['roleLevel'] as number || 0;
    return this.checkAuthentication(route.path || '', minRoleLevel);
  }

  private checkAuthentication(redirectUrl: string, minRoleLevel: number): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['auth/login'], { queryParams: { returnUrl: redirectUrl } });
      return false;
    }

    const userLevel = this.authService.getRoleLevel();
    if (userLevel < minRoleLevel) {
      this.router.navigate(['auth/forbidden']);
      return false;
    }

    return true;
  }
  
}
