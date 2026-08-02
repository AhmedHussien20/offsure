import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AppendTimesheetEntriesDto,
  HourlyProjectOverviewDto,
  TimesheetDayDto,
  TimesheetReportDto,
  TimesheetReportRequest,
  UpdateTimesheetEntryDto,
  UpsertTimesheetDto,
} from '../models/timesheets/timesheet.models';
import { BaseResponse } from '../models/base.response';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class TimesheetsService {
  private readonly service = 'timesheets';

  constructor(private api: ApiService) {}

  getDay(projectId: number, workDate: string): Observable<BaseResponse<TimesheetDayDto | null>> {
    return this.api.get<BaseResponse<TimesheetDayDto | null>>(this.service, 'day', {
      projectId,
      workDate,
    });
  }

  upsertDay(dto: UpsertTimesheetDto): Observable<BaseResponse<TimesheetDayDto>> {
    return this.api.put<BaseResponse<TimesheetDayDto>>(this.service, 'day', dto);
  }

  appendEntries(dto: AppendTimesheetEntriesDto): Observable<BaseResponse<TimesheetDayDto>> {
    return this.api.post<BaseResponse<TimesheetDayDto>>(this.service, 'day/entries', dto);
  }

  updateEntry(entryId: number, dto: UpdateTimesheetEntryDto): Observable<BaseResponse<TimesheetDayDto>> {
    return this.api.put<BaseResponse<TimesheetDayDto>>(this.service, `day/entries/${entryId}`, dto);
  }

  deleteEntry(entryId: number): Observable<BaseResponse<TimesheetDayDto>> {
    return this.api.delete<BaseResponse<TimesheetDayDto>>(this.service, `day/entries/${entryId}`);
  }

  getProjectOverview(projectId: number): Observable<BaseResponse<HourlyProjectOverviewDto>> {
    return this.api.get<BaseResponse<HourlyProjectOverviewDto>>(
      this.service,
      `projects/${projectId}/overview`
    );
  }

  getReport(request: TimesheetReportRequest): Observable<BaseResponse<TimesheetReportDto>> {
    return this.api.get<BaseResponse<TimesheetReportDto>>(this.service, 'report', {
      projectId: request.projectId,
      period: request.period,
      teamMemberId: request.teamMemberId,
      resourceManagerUserId: request.resourceManagerUserId,
      rangeStart: request.rangeStart,
      rangeEnd: request.rangeEnd,
    });
  }
}
