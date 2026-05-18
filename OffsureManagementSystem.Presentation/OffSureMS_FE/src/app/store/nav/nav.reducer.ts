import { createReducer, on } from '@ngrx/store';
import { MenuItem } from '../../shared/models/menu-item.model';
import * as NavActions from './nav.actions';

export interface NavState {
  menuItems: MenuItem[];
}

export const initialState: NavState = {
  menuItems: [],  
};

export const navReducer = createReducer(
  initialState,

  on(NavActions.updateMenuItems, (state, { items }) => ({
    ...state,
    menuItems: items || [],  
  })),

  on(NavActions.clearMenu, () => ({
    ...initialState
  }))

);
