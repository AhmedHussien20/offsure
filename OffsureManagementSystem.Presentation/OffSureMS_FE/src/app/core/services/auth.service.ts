import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { AuthRepository } from '../repositories/auth.repository';
import { AppState } from 'app/store/app.state';
import { select, Store } from '@ngrx/store';
import { loginFailure, logout } from 'app/store/auth/auth.actions';
import { BaseResponse } from 'app/models/base.response.model';
import { selectAuthLoading } from 'app/store/auth/auth.selectors';
import { Router } from '@angular/router';
import { AuthUser } from '../models/auth/auth-user';
import * as NavActions from '../../store/nav/nav.actions';
import { ApiService } from './api.service';
import { RegisterRequest, RegisterResponse } from '../models/auth/register-request.model';
import { LoginResponse } from '../models/auth/login.models';
import { ClientContextService } from './client-context.service';
import { TeamContextService } from './team-context.service';
import { AuthTokenRefreshService } from './auth-token-refresh.service';

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
    private clientContext: ClientContextService,
    private teamContext: TeamContextService,
    private tokenRefresh: AuthTokenRefreshService,
  ) {
    this.store.pipe(select(selectAuthLoading)).subscribe(loading => {
      this.showLoader = loading;
    });
  }


  login(email: string, password: string): Observable<BaseResponse<LoginResponse>> {
    this.showLoader = true;

    return this.authRepository.login(email, password).pipe(
      map(response => {
        if (response.data) {
          this.tokenRefresh.persistSession(response.data);
          this.store.dispatch(NavActions.initializeMenu());
          return response;
        } else {
          const err = response.message || 'Login failed';
          this.store.dispatch(loginFailure({ error: err }));
          throw new Error(err);
        }
      }),
      catchError(error => {
        const errorMessage = error?.error?.message || error?.message || 'Login failed';
        this.store.dispatch(loginFailure({ error: errorMessage }));
        return throwError(() => new Error(errorMessage));
      }),
      finalize(() => {
        this.showLoader = false;
      })
    );
  }

  getCurrentUser() {
      const user = localStorage.getItem('userData');
      return user ? JSON.parse(user) : null;
    }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('customerHeaderNotifications');

    this.clientContext.clear();
    this.teamContext.clear();
    this.store.dispatch(logout());
    this.store.dispatch(NavActions.clearMenu());
    this.router.navigate(['/auth/login'], { replaceUrl: true });
  }

  /** Manual refresh (e.g. before a long-running action). Normally handled by the interceptor. */
  refreshSession(): Observable<string> {
    return this.tokenRefresh.refreshAccessToken();
  }

  forgotPassword(email: string): Observable<BaseResponse<null>> {
    return this.apiService.post<BaseResponse<null>>(
      this.service,
      'forgot-password',
      { email }
    );
  }

  resetPassword(request: { token: string; newPassword: string }): Observable<BaseResponse<null>> {
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

  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role ?? null;
  }

  isClient(): boolean {
    return this.getUserRole() === 'Client';
  }

  isAdministrator(): boolean {
    return this.getUserRole() === 'Administrator';
  }

  isTeamMember(): boolean {
    return this.getUserRole() === 'TeamMember';
  }

  hasPermission(permission: string): boolean {
    return this.getUser()?.permissions?.includes(permission) ?? false;
  }

  verifyEmail(userId: number, token: string): Observable<BaseResponse<null>> {
    return this.apiService.postWithQuery<BaseResponse<null>>(
      this.service,
      'verify-email',
      {},
      { userId, token }
    );
  }

  register(dto: RegisterRequest): Observable<BaseResponse<RegisterResponse>> {
    return this.authRepository.register(dto).pipe(
      map(response => {
        if (response.data) {
          return response;
        } else {
          const err = response.message || 'Registration failed';
          throw new Error(err);
        }
      }),
      catchError(error => {
        const errorMessage = error?.error?.message || error?.message || 'Registration failed';
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}


