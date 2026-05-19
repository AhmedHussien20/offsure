import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as AuthActions from './auth.actions';
import { catchError, map, mergeMap, of, tap } from 'rxjs';
import { AuthRepository } from '../../core/repositories/auth.repository';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authRepository = inject(AuthRepository);

  constructor() {}

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      mergeMap(({ userCode, password }) =>
        this.authRepository.login(userCode, password).pipe(
          map((response) => AuthActions.loginSuccess({
            user: {
              userId: response.data.user.id,
              fullName: `${response.data.user.firstName} ${response.data.user.lastName}`,
              email: response.data.user.email,
              role: response.data.user.role
            },
            token: response.data.accessToken
          })),
          catchError((error) => of(AuthActions.loginFailure({ error: error.message })))
        )
      )
    )
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => {
          localStorage.removeItem('authToken');
        })
      ),
    { dispatch: false }
  );
}
