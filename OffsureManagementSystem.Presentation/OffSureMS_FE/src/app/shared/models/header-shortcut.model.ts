/**
 * Header quick shortcuts (grid in header dropdown).
 *
 * - action `navigate` (default): router navigation to `path` (+ optional `queryParams`)
 * - action `modal`: open a registered create/edit dialog via `modalKey`
 *
 * Use list paths for "view all" (e.g. `/admin/requests`) and modal keys for "add new".
 */
export type HeaderShortcutAction = 'navigate' | 'modal';

export type HeaderShortcutModalKey =
  | 'client-request-create'
  | 'admin-team-create'
  | 'admin-service-create'
  | 'admin-portfolio-create'
  | 'admin-client-create'
  | 'admin-project-create';

export interface HeaderShortcut {
  title: string;
  icon: string;
  /** Required when action is `navigate` (default). */
  path?: string;
  queryParams?: Record<string, string>;
  action?: HeaderShortcutAction;
  modalKey?: HeaderShortcutModalKey;
  modalSize?: 'sm' | 'lg' | 'xl';
  alwaysEnabled?: boolean;
}
