import { AbstractControl, ValidatorFn } from "@angular/forms";

export function decimalValidator(): ValidatorFn {
  return (control: AbstractControl) => {

    if (control.value == null || control.value === '')
      return null;

    

    return isNaN(control.value) ? { decimal: true } : null;
  };
}
