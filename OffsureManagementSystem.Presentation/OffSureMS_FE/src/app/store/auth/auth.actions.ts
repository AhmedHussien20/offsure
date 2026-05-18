import { createAction, props } from '@ngrx/store';
import { User } from '../../models/user.model';

// 🔹 Login Actions
export const login = createAction(
  '[Auth] Login',
  props<{ userCode: string; password: string }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user?: User; token: string }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);


export const logout = createAction('[Auth] Logout');
