import { HttpBackend, HttpClient, HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginResponse } from '../models/auth/login.models';
import { BaseResponse } from '../models/base.response';
import { loginSuccess, logout } from '../../store/auth/auth.actions';
import * as NavActions from '../../store/nav/nav.actions';
import { ClientContextService } from './client-context.service';

const AUTH_API_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
];

const RETRY_HEADER = 'X-Retry-After-Refresh';

@Injectable({ providedIn: 'root' })
export class AuthTokenRefreshService {
  private readonly http: HttpClient;
  private refreshInFlight$?: Observable<string>;

  constructor(
    httpBackend: HttpBackend,
    private store: Store,
    private router: Router,
    private toastr: ToastrService,
    private clientContext: ClientContextService
  ) {
    this.http = new HttpClient(httpBackend);
  }

  isAuthExemptUrl(url: string): boolean {
    const normalized = url.toLowerCase();
    return AUTH_API_PATHS.some(path => normalized.includes(path));
  }

  getAccessToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  persistSession(data: LoginResponse): void {
    localStorage.setItem('authToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    if (data.user) {
      localStorage.setItem('userData', JSON.stringify(data.user));
    }
    this.store.dispatch(loginSuccess({ token: data.accessToken }));
  }

  refreshAccessToken(): Observable<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available.'));
    }

    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<BaseResponse<LoginResponse>>(`${environment.apiUrl}/Auth/refresh-token`, {
          refreshToken,
        })
        .pipe(
          map(res => {
            if (!res.success || !res.data?.accessToken) {
              throw new Error(res.message || 'Unable to refresh session.');
            }
            this.persistSession(res.data);
            return res.data.accessToken;
          }),
          catchError(err => throwError(() => err)),
          finalize(() => {
            this.refreshInFlight$ = undefined;
          }),
          shareReplay(1)
        );
    }

    return this.refreshInFlight$;
  }

  handleUnauthorized(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
  ): Observable<HttpEvent<unknown>> {
    if (req.headers.has(RETRY_HEADER)) {
      this.sessionExpiredLogout();
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    if (!this.getRefreshToken()) {
      this.sessionExpiredLogout();
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    return this.refreshAccessToken().pipe(
      switchMap(accessToken =>
        next(
          req.clone({
            setHeaders: {
              Authorization: `Bearer ${accessToken}`,
              [RETRY_HEADER]: 'true',
            },
          })
        )
      ),
      catchError(err => {
        this.sessionExpiredLogout();
        return throwError(() => err);
      })
    );
  }

  sessionExpiredLogout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('customerHeaderNotifications');

    this.clientContext.clear();
    this.store.dispatch(logout());
    this.store.dispatch(NavActions.clearMenu());

    this.toastr.error(
      'Your session has expired. Please log in again.',
      'Session expired',
      { timeOut: 4000, positionClass: 'toast-top-right' }
    );

    const url = this.router.url.split('?')[0] || '/';
    const onPublicLanding = url === '/' || url.startsWith('/landing');
    // Stay on the marketing page so Login becomes visible again.
    if (!onPublicLanding && !url.startsWith('/auth/')) {
      this.router.navigate(['/auth/login'], { replaceUrl: true });
    }
  }
}
