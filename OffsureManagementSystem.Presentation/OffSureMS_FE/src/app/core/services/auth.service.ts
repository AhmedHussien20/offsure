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
import { LoginResponse } from '../models/auth/login.models';

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


  login(email: string, password: string): Observable<BaseResponse<LoginResponse>> {
    this.showLoader = true;

    return this.authRepository.login(email, password).pipe(
      map(response => {
        if (response.data) {
          const { accessToken, refreshToken, user } = response.data;
          localStorage.setItem('authToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('userData', JSON.stringify(user));
          this.store.dispatch(NavActions.initializeMenu());
          this.store.dispatch(loginSuccess({ token: accessToken }));
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

    this.store.dispatch(NavActions.clearMenu());
    this.router.navigate(['/auth/login'], { replaceUrl: true });
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

  hasPermission(permission: string): boolean {
    return this.getUser()?.permissions?.includes(permission) ?? false;
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


