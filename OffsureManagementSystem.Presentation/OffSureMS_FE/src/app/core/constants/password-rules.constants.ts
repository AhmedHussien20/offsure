import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordRule {
  key: string;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'minLength', label: 'At least 8 characters', test: v => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter (A–Z)', test: v => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter (a–z)', test: v => /[a-z]/.test(v) },
  { key: 'number', label: 'One number (0–9)', test: v => /\d/.test(v) },
  { key: 'special', label: 'One special character (!@#$…)', test: v => /[^A-Za-z0-9]/.test(v) },
];

export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) {
    return null;
  }
  const failed = PASSWORD_RULES.some(rule => !rule.test(value));
  return failed ? { passwordStrength: true } : null;
}

export function allPasswordRulesMet(value: string): boolean {
  return PASSWORD_RULES.every(rule => rule.test(value));
}

export function passwordMatchValidator(passwordKey: string, confirmKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get(passwordKey);
    const confirm = control.get(confirmKey);
    if (!password || !confirm) {
      return null;
    }
    return password.value === confirm.value ? null : { passwordMismatch: true };
  };
}
