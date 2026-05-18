import { createAction, props } from '@ngrx/store';
import { MenuItem } from '../../shared/models/menu-item.model';

export const initializeMenu = createAction('[Nav] Initialize Menu');
export const updateMenuItems = createAction(
  '[Nav] Update Menu Items',
  props<{ items: MenuItem[] }>()
);
export const updateMenuTranslations = createAction('[Nav] Update Menu Translations');

export const clearMenu = createAction('[Nav] Clear Menu');
