import { FormGroup, Validators } from '@angular/forms';
import { ProjectBudgetMode } from '../models/projects/project.models';

export function resolveProjectBudget(form: FormGroup, requestBudget?: number | null): number | undefined {
  const mode = form.get('budgetMode')?.value;
  if (mode === 'sameAsRequest') {
    return requestBudget ?? undefined;
  }
  if (form.get('customBudgetType')?.value === 'hourly') {
    const rate = Number(form.get('hourlyRate')?.value) || 0;
    const hours = Number(form.get('expectedHours')?.value) || 0;
    const total = rate * hours;
    return total > 0 ? total : undefined;
  }
  const total = Number(form.get('totalBudget')?.value);
  return Number.isFinite(total) && total > 0 ? total : undefined;
}

export function updateProjectBudgetValidators(form: FormGroup, mode: 'standalone' | 'convert'): void {
  const budgetMode = form.get('budgetMode')?.value as ProjectBudgetMode | undefined;
  const customType = form.get('customBudgetType')?.value;
  const totalCtrl = form.get('totalBudget');
  const rateCtrl = form.get('hourlyRate');
  const hoursCtrl = form.get('expectedHours');

  totalCtrl?.clearValidators();
  rateCtrl?.clearValidators();
  hoursCtrl?.clearValidators();

  const needsCustom =
    mode === 'standalone' || (mode === 'convert' && budgetMode === 'custom');

  if (needsCustom) {
    if (customType === 'total') {
      totalCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      rateCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
      hoursCtrl?.setValidators([Validators.required, Validators.min(1)]);
    }
  }

  totalCtrl?.updateValueAndValidity({ emitEvent: false });
  rateCtrl?.updateValueAndValidity({ emitEvent: false });
  hoursCtrl?.updateValueAndValidity({ emitEvent: false });
}
