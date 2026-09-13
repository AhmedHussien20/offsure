import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
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
import { ProjectFetchCache } from './project-fetch-cache.service';

@Injectable({ providedIn: 'root' })
export class TimesheetsService {
  private readonly service = 'timesheets';

  constructor(
    private api: ApiService,
    private projectCache: ProjectFetchCache
  ) {}

  getDay(projectId: number, workDate: string): Observable<BaseResponse<TimesheetDayDto | null>> {
    return this.api.get<BaseResponse<TimesheetDayDto | null>>(this.service, 'day', {
      projectId,
      workDate,
    });
  }

  upsertDay(dto: UpsertTimesheetDto): Observable<BaseResponse<TimesheetDayDto>> {
    return this.api.put<BaseResponse<TimesheetDayDto>>(this.service, 'day', dto).pipe(
      tap(() => this.projectCache.invalidateProject(dto.projectId))
    );
  }

  appendEntries(dto: AppendTimesheetEntriesDto): Observable<BaseResponse<TimesheetDayDto>> {
    return this.api.post<BaseResponse<TimesheetDayDto>>(this.service, 'day/entries', dto).pipe(
      tap(() => this.projectCache.invalidateProject(dto.projectId))
    );
  }

  updateEntry(entryId: number, dto: UpdateTimesheetEntryDto): Observable<BaseResponse<TimesheetDayDto>> {
    return this.api.put<BaseResponse<TimesheetDayDto>>(this.service, `day/entries/${entryId}`, dto).pipe(
      tap(res => {
        const projectId = res.data?.projectId;
        if (projectId) {
          this.projectCache.invalidateProject(projectId);
        }
      })
    );
  }

  deleteEntry(entryId: number): Observable<BaseResponse<TimesheetDayDto>> {
    return this.api.delete<BaseResponse<TimesheetDayDto>>(this.service, `day/entries/${entryId}`).pipe(
      tap(res => {
        const projectId = res.data?.projectId;
        if (projectId) {
          this.projectCache.invalidateProject(projectId);
        }
      })
    );
  }

  getProjectOverview(projectId: number): Observable<BaseResponse<HourlyProjectOverviewDto>> {
    const key = ProjectFetchCache.overviewKey(projectId);
    const cached = this.projectCache.get<BaseResponse<HourlyProjectOverviewDto>>(key);
    if (cached) {
      return of(cached);
    }

    return this.api
      .get<BaseResponse<HourlyProjectOverviewDto>>(this.service, `projects/${projectId}/overview`)
      .pipe(tap(res => this.projectCache.set(key, res)));
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
