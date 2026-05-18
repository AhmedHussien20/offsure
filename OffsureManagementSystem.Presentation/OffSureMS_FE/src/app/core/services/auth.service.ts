import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { AuthRepository } from '../repositories/auth.repository';
import { AppState } from 'app/store/app.state';
import { select, Store } from '@ngrx/store';
import { loginFailure, loginSuccess, logout } from 'app/store/auth/auth.actions';
import { BaseResponse } from 'app/models/base.response.model';
import { selectAuthLoading } from 'app/store/auth/auth.selectors';
import { Router } from '@angular/router';
import { AuthUser } from '../models/auth/auth-user';
import * as NavActions from '../../store/nav/nav.actions';
import { ApiService } from './api.service';
import { RegisterRequest, RegisterResponse } from '../models/auth/register-request.model';
import {
  AdminLoginRequest,
  AdminLoginResponse,
  ChangePasswordFirstLoginRequest,
  LoginResponse,
} from '../models/auth/login.models';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly service = 'Auth';
  public showLoader: boolean = false;
  constructor(
    private authRepository: AuthRepository,
    private store: Store<AppState>,
    private router: Router,
    private apiService: ApiService,
  ) {
    this.store.pipe(select(selectAuthLoading)).subscribe(loading => {
      this.showLoader = loading;
    });
  }
  getCurrentUser() {
    const user = localStorage.getItem('userData');
    return user ? JSON.parse(user) : null;
  }


  /** Customer portal login (username only). */
  login(username: string, password: string): Observable<BaseResponse<LoginResponse>> {
    // NOTE: This method calls the API directly. Do NOT dispatch the NgRx `login` action here,
    // otherwise `AuthEffects.login$` will trigger a second duplicate HTTP request.
    this.showLoader = true;

    return this.authRepository.login(username, password).pipe(
      map(response => {
        if (response.data !== null) {
          // If backend indicates first-login/forced password change:
          // - no JWT is returned
          // - caller should navigate to change-password-first-login
          if (response.data.forcePasswordChange) {
            this.store.dispatch(loginFailure({ error: '' })); // clear loading state
            return response;
          }

          const token = response.data.token || '';
          const userData = { ...response.data, type: 'customer' as const };
          localStorage.setItem('authToken', token);
          localStorage.setItem('userData', JSON.stringify(userData));
          this.store.dispatch(NavActions.initializeMenu());

          this.store.dispatch(loginSuccess({ token }));
          return response;
        } else {
          const err = (response as any)?.errorList?.join?.('\n') || response.message || 'Login failed';
          this.store.dispatch(loginFailure({ error: err }));
          throw new Error(err);
        }
      }),
      catchError(error => {
        const errorMessage =
          error?.error?.message ||
          error?.message ||
          (error?.errorList ? error.errorList.join('\n') : '') ||
          'Login failed';
        this.store.dispatch(loginFailure({ error: errorMessage }));
        return throwError(() => new Error(errorMessage));
      }),
      finalize(() => {
        this.showLoader = false;
      })
    );
  }

  changePasswordFirstLogin(dto: ChangePasswordFirstLoginRequest): Observable<BaseResponse<'OK'>> {
    return this.authRepository.changePasswordFirstLogin(dto).pipe(
      catchError(error => {
        const errorMessage =
          error?.error?.message ||
          error?.message ||
          'Password change failed';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  logout() {
    const wasSystem = this.isSystemPortalUser();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
     localStorage.removeItem('userRole');
  localStorage.removeItem('currentUser');
    localStorage.removeItem('customerHeaderNotifications');
  
    
    this.store.dispatch(NavActions.clearMenu());  

    this.router.navigate(wasSystem ? ['/auth/admin/login'] : ['/auth/login'], { replaceUrl: true });
  }

    forgotPassword(email: string): Observable<BaseResponse<null>> {
    return this.apiService.post<BaseResponse<null>>(
      this.service,
      'forgot-password',
      { email }
    );
  }

 verifyResetCode(request: { email: string; token: string }): Observable<BaseResponse<null>> {
    return this.apiService.post<BaseResponse<null>>(
      this.service,
      'verify-reset-code',
      request
    );
  }

  updatePassword(request: { email: string; newPassword: string }): Observable<BaseResponse<null>> {
    return this.apiService.post<BaseResponse<null>>(
      this.service,
      'reset-password',
      request
    );
  }



  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getUser(): AuthUser | null {
    const u = localStorage.getItem('userData');
    return u ? JSON.parse(u) : null;
  }

  /** Internal staff session (JWT from POST api/v1/admin/auth/login). */
  isSystemPortalUser(): boolean {
    const u = this.getUser() as { type?: string } | null;
    return u?.type === 'system';
  }

  /** Administration portal login — separate from customer AuthController (username only). */
  loginAdmin(username: string, password: string): Observable<BaseResponse<AdminLoginResponse>> {
      this.showLoader = true;
    const body: AdminLoginRequest = { userName: username, password };
    return this.apiService
      .post<BaseResponse<AdminLoginResponse>>('v1/admin', 'auth/login', body)
      .pipe(
        map(response => {
          if (response.data !== null) {
            const userData: AdminLoginResponse = {
              ...response.data,
              type: 'system',
            };
            localStorage.setItem('authToken', userData.token);
            localStorage.setItem('userData', JSON.stringify(userData));
            this.store.dispatch(NavActions.initializeMenu());
            this.store.dispatch(loginSuccess({ token: userData.token }));
            return { ...response, data: userData };
          }
          const err =
            (response as any)?.errorList?.join?.('\n') || response.message || 'Login failed';
          throw new Error(err);
        }),
        catchError(error => {
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            (error?.error?.errorList ? error.error.errorList.join('\n') : '') ||
            'Login failed';
          return throwError(() => new Error(errorMessage));
        }),
          finalize(() => {
        this.showLoader = false;
      })
      );
  }
  hasPermission(permission: string): boolean {
    return this.getUser()?.permissions.includes(permission) ?? false;
  }

  hasMinRoleLevel(level: number): boolean {
    return (this.getUser()?.roleLevel ?? 0) >= level;
  }

  getRoleLevel(): number {
    return this.getUser()?.roleLevel ?? 0;
  }

  register(dto: RegisterRequest): Observable<BaseResponse<RegisterResponse>> {
  return this.authRepository.register(dto).pipe(
    map(response => {
      if (response.data !== null) {
        if (!response.data.workspaceId || response.data.workspaceId <= 0) {
          throw new Error('API did not return WorkspaceId');
        }
       
        return response;
      } else {
        const err = response.errorList?.join('\n') || response.message || 'Registration failed';
        throw new Error(err);
      }
    }),
    catchError(error => {
      let errorMessage = error?.message || 'Registration failed';
      if (error?.errorList) {
        errorMessage = error.errorList.join('\n');
      }
      return throwError(() => new Error(errorMessage));
    })
  );
}

}
