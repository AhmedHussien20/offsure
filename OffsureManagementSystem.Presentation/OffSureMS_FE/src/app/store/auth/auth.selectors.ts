import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

// Get the auth state
export const selectAuthState = createFeatureSelector<AuthState>('auth');

// 🔹 Select User
export const selectAuthUser = createSelector(
  selectAuthState,
  (state) => state.user
);

// 🔹 Select Token
export const selectAuthToken = createSelector(
  selectAuthState,
  (state) => state.token
);

// 🔹 Select Loading
export const selectAuthLoading = createSelector(
  selectAuthState,
  (state) => state.loading
);

// 🔹 Select Error
export const selectAuthError = createSelector(
  selectAuthState,
  (state) => state.error
);
