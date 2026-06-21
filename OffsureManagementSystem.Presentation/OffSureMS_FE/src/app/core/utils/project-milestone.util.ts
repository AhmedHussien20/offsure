import { MilestoneStatus, ProjectMilestoneDto } from '../models/projects/project.models';

export const MIN_MILESTONE_COUNT = 2;
export const MAX_MILESTONE_COUNT = 20;
export const MILESTONE_PERCENTAGE_TOLERANCE = 0.01;

export function milestonePaymentAmount(budget: number | null | undefined, percentage: number): number {
  if (!budget || budget <= 0 || percentage <= 0) {
    return 0;
  }
  return Math.round((budget * percentage) / 100 * 100) / 100;
}

export function milestonePercentageTotal(milestones: Pick<ProjectMilestoneDto, 'paymentPercentage'>[]): number {
  return milestones.reduce((sum, m) => sum + (Number(m.paymentPercentage) || 0), 0);
}

export function milestonesPercentagesValid(
  milestones: Pick<ProjectMilestoneDto, 'paymentPercentage'>[]
): boolean {
  const total = milestonePercentageTotal(milestones);
  return Math.abs(total - 100) <= MILESTONE_PERCENTAGE_TOLERANCE;
}

export function normalizeMilestoneStatus(status: unknown): MilestoneStatus {
  const value = String(status ?? '');
  if (value === MilestoneStatus.InProgress || value === '2') {
    return MilestoneStatus.InProgress;
  }
  if (value === MilestoneStatus.Completed || value === '3') {
    return MilestoneStatus.Completed;
  }
  return MilestoneStatus.NotStarted;
}

export function milestoneStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.InProgress:
      return 'In progress';
    case MilestoneStatus.Completed:
      return 'Completed';
    default:
      return 'Not started';
  }
}

export interface MilestoneDraftValue {
  name: string;
  description?: string;
  paymentPercentage: number;
  startDate?: string;
  endDate?: string;
}

export function buildCreateMilestoneItems(
  drafts: MilestoneDraftValue[]
): { name: string; description?: string; order: number; paymentPercentage: number; startDate?: string; endDate?: string }[] {
  return drafts.map((draft, index) => ({
    name: draft.name.trim(),
    description: draft.description?.trim() || undefined,
    order: index + 1,
    paymentPercentage: Number(draft.paymentPercentage),
    startDate: draft.startDate || undefined,
    endDate: draft.endDate || undefined,
  }));
}

export function milestonesDraftsValid(drafts: MilestoneDraftValue[]): boolean {
  return (
    drafts.length > 0 &&
    drafts.every(d => d.name.trim().length > 0 && Number(d.paymentPercentage) > 0) &&
    milestonesPercentagesValid(drafts)
  );
}
