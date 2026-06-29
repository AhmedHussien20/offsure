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

export interface MilestoneDateDraft {
  name: string;
  order: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: MilestoneStatus;
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value?.trim()) {
    return null;
  }
  const date = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA <= endB && startB <= endA;
}

export function validateMilestoneDraftDates(
  drafts: MilestoneDateDraft[],
  projectStartDate?: string | null,
  projectTargetEndDate?: string | null
): { valid: boolean; message: string } {
  const issues = getMilestoneDraftDateIssues(drafts, projectStartDate, projectTargetEndDate);
  return { valid: issues.length === 0, message: issues[0] ?? '' };
}

export function getMilestoneDraftDateIssues(
  drafts: MilestoneDateDraft[],
  projectStartDate?: string | null,
  projectTargetEndDate?: string | null
): string[] {
  const issues: string[] = [];
  const projectStart = parseDateOnly(projectStartDate);
  const projectEnd = parseDateOnly(projectTargetEndDate);
  const editable = drafts.filter(d => d.status !== MilestoneStatus.Completed);

  for (const draft of editable) {
    const label = draft.name.trim() || `Phase ${draft.order}`;
    const start = parseDateOnly(draft.startDate);
    const end = parseDateOnly(draft.endDate);

    if (!start || !end) {
      issues.push(`${label}: enter both start and end dates.`);
      continue;
    }

    if (start > end) {
      issues.push(`${label}: start date must be on or before the end date.`);
    }

    if (projectStart && start < projectStart) {
      issues.push(
        `${label}: start date cannot be before the project start (${formatDateOnly(projectStart)}).`
      );
    }

    if (projectEnd && end > projectEnd) {
      issues.push(
        `${label}: end date cannot be after the project deadline (${formatDateOnly(projectEnd)}).`
      );
    }
  }

  const dated = editable
    .map(draft => ({
      order: draft.order,
      label: draft.name.trim() || `Phase ${draft.order}`,
      start: parseDateOnly(draft.startDate),
      end: parseDateOnly(draft.endDate),
    }))
    .filter(d => d.start && d.end)
    .map(d => ({ ...d, start: d.start!, end: d.end! }))
    .sort((a, b) => a.order - b.order || a.start.getTime() - b.start.getTime());

  for (let i = 0; i < dated.length; i++) {
    for (let j = i + 1; j < dated.length; j++) {
      const first = dated[i];
      const second = dated[j];
      if (rangesOverlap(first.start, first.end, second.start, second.end)) {
        issues.push(`Phases "${first.label}" and "${second.label}" have overlapping dates.`);
      }
    }
  }

  return issues;
}

export interface MilestoneDraftForValidation extends MilestoneDateDraft {
  paymentPercentage: number;
}

export function getMilestoneDraftValidationIssues(
  drafts: MilestoneDraftForValidation[],
  options: {
    maxMilestones: number;
    isInitialDefinition: boolean;
    projectStartDate?: string | null;
    projectTargetEndDate?: string | null;
    isDraftCompleted?: (draft: MilestoneDraftForValidation) => boolean;
  }
): string[] {
  const issues: string[] = [];
  const isCompleted = options.isDraftCompleted ?? (d => d.status === MilestoneStatus.Completed);

  if (options.isInitialDefinition) {
    if (drafts.length !== options.maxMilestones || options.maxMilestones <= 0) {
      issues.push(`Define all ${options.maxMilestones} phases.`);
    }
  } else if (drafts.length === 0) {
    issues.push('Add at least one phase.');
  } else if (drafts.length > options.maxMilestones) {
    issues.push(`This project allows up to ${options.maxMilestones} phases.`);
  }

  for (const draft of drafts) {
    if (isCompleted(draft)) {
      continue;
    }
    const label = draft.name.trim() || `Phase ${draft.order}`;
    if (!draft.name.trim()) {
      issues.push(`${label}: enter a phase name.`);
    }
    if (!(Number(draft.paymentPercentage) > 0)) {
      issues.push(`${label}: enter a payment share greater than 0%.`);
    }
  }

  if (drafts.length > 0 && !milestonesPercentagesValid(drafts)) {
    const total = milestonePercentageTotal(drafts);
    issues.push(`Payment shares must total 100% (currently ${total.toFixed(2)}%).`);
  }

  issues.push(
    ...getMilestoneDraftDateIssues(drafts, options.projectStartDate, options.projectTargetEndDate)
  );

  return issues;
}
