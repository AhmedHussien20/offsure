import { AuthState } from './auth/auth.state';
import { NavState } from './nav/nav.reducer';  


export interface AppState {
  auth: AuthState;
  nav: NavState;  
}
