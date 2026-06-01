import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthTokenRefreshService } from '../services/auth-token-refresh.service';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenRefresh = inject(AuthTokenRefreshService);

  if (tokenRefresh.isAuthExemptUrl(req.url)) {
    return next(req);
  }

  const token = tokenRefresh.getAccessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      return tokenRefresh.handleUnauthorized(authReq, next);
    })
  );
};
