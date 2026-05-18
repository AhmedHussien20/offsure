import { createReducer, on } from '@ngrx/store';
import * as AuthActions from './auth.actions';
import { AuthState, initialAuthState } from './auth.state';

export const authReducer = createReducer(
  initialAuthState,

  // 🔹 Login Start
  on(AuthActions.login, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  // 🔹 Login Success
  on(AuthActions.loginSuccess, (state, { user, token }) => ({
    ...state,
    user: user ?? null,
    token,
    loading: false,
    error: null,
  })),

  // 🔹 Login Failure
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // 🔹 Logout
  on(AuthActions.logout, () => ({
    ...initialAuthState
  }))
);
