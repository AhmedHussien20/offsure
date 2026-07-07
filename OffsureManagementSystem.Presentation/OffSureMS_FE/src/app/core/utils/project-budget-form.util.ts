import { FormGroup, Validators } from '@angular/forms';
import {
  CreateProjectDto,
  ProjectBudgetMode,
  ProjectBudgetType,
  ProjectCustomBudgetType,
} from '../models/projects/project.models';

export function isHourlyBudgetProject(
  project: { budgetType?: ProjectBudgetType } | null | undefined
): boolean {
  return project?.budgetType === 'Hourly';
}

export function isCustomProjectBudgetValid(
  form: FormGroup,
  requestBudget?: number | null
): boolean {
  const mode = form.get('budgetMode')?.value;
  if (mode === 'sameAsRequest') {
    return requestBudget != null && requestBudget > 0;
  }

  const customType = form.get('customBudgetType')?.value;
  if (customType === 'hourly') {
    const rate = Number(form.get('hourlyRate')?.value);
    return Number.isFinite(rate) && rate > 0;
  }

  const total = Number(form.get('totalBudget')?.value);
  return Number.isFinite(total) && total > 0;
}

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

export function buildProjectBudgetFields(
  form: FormGroup,
  requestBudget?: number | null
): Pick<CreateProjectDto, 'budget' | 'budgetType' | 'hourlyRate' | 'expectedHours'> {
  const mode = form.get('budgetMode')?.value as ProjectBudgetMode | undefined;
  if (mode === 'sameAsRequest') {
    return {
      budget: requestBudget ?? undefined,
      budgetType: 'Total',
    };
  }

  const customType = form.get('customBudgetType')?.value as ProjectCustomBudgetType | undefined;
  if (customType === 'hourly') {
    const hourlyRate = Number(form.get('hourlyRate')?.value) || 0;
    return {
      budgetType: 'Hourly',
      hourlyRate: hourlyRate > 0 ? hourlyRate : undefined,
      expectedHours: undefined,
      budget: undefined,
    };
  }

  return {
    budgetType: 'Total',
    budget: resolveProjectBudget(form, requestBudget),
  };
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
    }
  }

  totalCtrl?.updateValueAndValidity({ emitEvent: false });
  rateCtrl?.updateValueAndValidity({ emitEvent: false });
  hoursCtrl?.updateValueAndValidity({ emitEvent: false });
}

/** Defaults for assign-modal rate/hours from project (and member salary fallback). */
export function resolveAssignmentDefaults(
  project: {
    budgetType?: ProjectBudgetType;
    hourlyRate?: number | null;
    expectedHours?: number | null;
  } | null | undefined,
  member: { hourlySalary?: number | null }
): { hourlyRate: number | null; allocatedHours: number | null } {
  const fromProject = project?.budgetType === 'Hourly';
  const hourlyRate =
    fromProject && project?.hourlyRate != null && project.hourlyRate > 0
      ? project.hourlyRate
      : member.hourlySalary != null && member.hourlySalary > 0
        ? member.hourlySalary
        : null;
  const allocatedHours =
    fromProject && project?.expectedHours != null && project.expectedHours > 0
      ? project.expectedHours
      : null;

  return { hourlyRate, allocatedHours };
}

/** RM assign modal: use RM's project cost rate; hours only when project has expected hours. */
export function resolveRmAssignmentDefaults(
  project: {
    budgetType?: ProjectBudgetType;
    expectedHours?: number | null;
    myHourlyCostRate?: number | null;
  } | null | undefined
): { hourlyRate: number | null; allocatedHours: number | null } {
  const hourlyRate =
    project?.myHourlyCostRate != null && project.myHourlyCostRate > 0
      ? project.myHourlyCostRate
      : null;
  const allocatedHours =
    project?.budgetType === 'Hourly' && project?.expectedHours != null && project.expectedHours > 0
      ? project.expectedHours
      : null;

  return { hourlyRate, allocatedHours };
}

/** Cost rate from the member's RM when that RM is assigned to the project. */
export function memberHasResourceManager(member: { resourceManagerId?: number | null }): boolean {
  const rmId = Number(member.resourceManagerId);
  return Number.isFinite(rmId) && rmId > 0;
}

export function resolveMemberProjectRmCostRate(
  project: { resourceManagers?: { userId: number; hourlyCostRate?: number | null }[] } | null | undefined,
  member: { resourceManagerId?: number | null }
): number | null {
  const rmId = Number(member.resourceManagerId);
  if (!Number.isFinite(rmId) || rmId <= 0) {
    return null;
  }
  const rm = (project?.resourceManagers ?? []).find(r => Number(r.userId) === rmId);
  const rate = Number(rm?.hourlyCostRate);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function memberHasProjectRmAssigned(
  project: { resourceManagers?: { userId: number }[] } | null | undefined,
  member: { resourceManagerId?: number | null }
): boolean {
  const rmId = Number(member.resourceManagerId);
  if (!Number.isFinite(rmId) || rmId <= 0) {
    return false;
  }
  return (project?.resourceManagers ?? []).some(r => Number(r.userId) === rmId);
}

export function memberRmMissingFromProject(
  project: { resourceManagers?: { userId: number }[] } | null | undefined,
  member: { resourceManagerId?: number | null }
): boolean {
  return memberHasResourceManager(member) && !memberHasProjectRmAssigned(project, member);
}
