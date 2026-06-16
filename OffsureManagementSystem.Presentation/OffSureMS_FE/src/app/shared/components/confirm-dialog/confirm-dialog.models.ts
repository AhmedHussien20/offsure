export type ConfirmDialogVariant = 'danger' | 'warning' | 'primary';

export type ConfirmDialogChoice = 'confirm' | 'alternate';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When set, shows a second action button that resolves as `'alternate'`. */
  alternateConfirmLabel?: string;
  variant?: ConfirmDialogVariant;
  icon?: string;
}
