import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

@Injectable({ providedIn: 'root' })
export class RoleLevelGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const minLevel = route.data['minRoleLevel'];
    if (!minLevel) return true;

    if (!this.auth.hasMinRoleLevel(minLevel)) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  }
}
