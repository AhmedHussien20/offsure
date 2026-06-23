import {
  HourlyProjectOverviewDto,
  HourlyProjectResourceSummaryDto,
  TimesheetReportDto,
} from 'app/core/models/timesheets/timesheet.models';
import { ProjectDto } from 'app/core/models/projects/project.models';

export function buildResourceSummariesFromReport(
  report: TimesheetReportDto | null | undefined,
  overview: HourlyProjectOverviewDto | null | undefined,
  project: ProjectDto | null | undefined
): HourlyProjectResourceSummaryDto[] {
  if (!report?.rows.length) {
    return [];
  }

  const metaByMember = new Map<
    number,
    { role: string; costRate: number | null; teamMemberName: string }
  >();

  for (const resource of overview?.resources ?? []) {
    metaByMember.set(resource.teamMemberId, {
      role: resource.role,
      costRate: resource.costRate,
      teamMemberName: resource.teamMemberName,
    });
  }

  for (const assignment of project?.teamMembers ?? []) {
    if (!metaByMember.has(assignment.teamMemberId)) {
      metaByMember.set(assignment.teamMemberId, {
        role: assignment.role,
        costRate: assignment.hourlyRate,
        teamMemberName: assignment.teamMemberName,
      });
    }
  }

  const grouped = new Map<number, HourlyProjectResourceSummaryDto>();

  for (const row of report.rows) {
    const meta = metaByMember.get(row.teamMemberId);
    const existing = grouped.get(row.teamMemberId);

    if (existing) {
      existing.totalHours += row.hours;
      continue;
    }

    grouped.set(row.teamMemberId, {
      teamMemberId: row.teamMemberId,
      teamMemberName: row.teamMemberName,
      role: meta?.role ?? '—',
      costRate: meta?.costRate ?? null,
      totalHours: row.hours,
    });
  }

  return Array.from(grouped.values())
    .filter(r => r.totalHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours);
}

export function sumResourceLineCost(resources: HourlyProjectResourceSummaryDto[]): number {
  return resources.reduce((sum, r) => sum + r.totalHours * (r.costRate ?? 0), 0);
}
