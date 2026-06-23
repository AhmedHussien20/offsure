export type TimesheetReportPeriod = 'Week' | 'Month' | 'FullPeriod';

export interface UpsertTimesheetEntryDto {
  id?: number | null;
  startTime: string;
  endTime: string;
  description: string;
}

export interface UpsertTimesheetDto {
  projectId: number;
  workDate: string;
  entries: UpsertTimesheetEntryDto[];
}

export interface AppendTimesheetEntriesDto {
  projectId: number;
  workDate: string;
  entries: UpsertTimesheetEntryDto[];
}

export interface UpdateTimesheetEntryDto {
  startTime: string;
  endTime: string;
  description: string;
}

export interface TimesheetEntryDto {
  id: number;
  startTime: string;
  endTime: string;
  description: string;
  hours: number;
}

export interface TimesheetDayDto {
  id: number;
  projectId: number;
  projectName: string;
  teamMemberId: number;
  teamMemberName: string;
  workDate: string;
  totalHours: number;
  entries: TimesheetEntryDto[];
}

export interface HourlyProjectDaySummaryDto {
  date: string;
  dayLabel: string;
  hours: number;
  isToday: boolean;
}

export interface HourlyProjectResourceSummaryDto {
  teamMemberId: number;
  teamMemberName: string;
  role: string;
  costRate: number | null;
  totalHours: number;
}

export interface HourlyProjectOverviewDto {
  hourlyRate: number;
  totalHoursLogged: number;
  thisWeekHours: number;
  estimatedRevenue: number;
  thisWeek: HourlyProjectDaySummaryDto[];
  resources: HourlyProjectResourceSummaryDto[];
}

export interface TimesheetReportRowDto {
  workDate: string;
  teamMemberId: number;
  teamMemberName: string;
  startTime: string;
  endTime: string;
  description: string;
  hours: number;
}

export interface TimesheetReportDto {
  projectId: number;
  projectName: string;
  rangeStart: string;
  rangeEnd: string;
  totalHours: number;
  estimatedRevenue: number | null;
  totalCost: number | null;
  rows: TimesheetReportRowDto[];
}

export interface TimesheetReportRequest {
  projectId: number;
  period: TimesheetReportPeriod;
  teamMemberId?: number;
  resourceManagerUserId?: number;
  rangeStart?: string;
  rangeEnd?: string;
}
