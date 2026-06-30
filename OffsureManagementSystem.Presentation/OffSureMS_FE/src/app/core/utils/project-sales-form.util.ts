import { FormGroup } from '@angular/forms';
import { CommissionType, CreateProjectDto } from '../models/projects/project.models';

export function buildProjectSalesFields(form: FormGroup): Pick<
  CreateProjectDto,
  'salesId' | 'commissionType' | 'commissionValue'
> {
  const raw = form.getRawValue();
  const salesId = raw.salesId != null && raw.salesId !== '' ? Number(raw.salesId) : undefined;

  if (!salesId) {
    return {};
  }

  const commissionType = raw.commissionType as CommissionType | null;
  const commissionValue =
    raw.commissionValue != null && raw.commissionValue !== ''
      ? Number(raw.commissionValue)
      : undefined;

  return {
    salesId,
    commissionType: commissionType ?? undefined,
    commissionValue,
  };
}

export function resolveProjectBudgetForSales(form: FormGroup, requestBudget?: number | null): number | null {
  const raw = form.getRawValue();
  if (raw.customBudgetType === 'hourly') {
    return null;
  }
  if (raw.budgetMode === 'sameAsRequest' && requestBudget != null) {
    return requestBudget;
  }
  const total = raw.totalBudget;
  return total != null && total !== '' ? Number(total) : null;
}

export function resolveStandaloneProjectBudget(form: FormGroup): number | null {
  const raw = form.getRawValue();
  if (raw.customBudgetType === 'hourly') {
    return null;
  }
  const total = raw.totalBudget;
  return total != null && total !== '' ? Number(total) : null;
}
