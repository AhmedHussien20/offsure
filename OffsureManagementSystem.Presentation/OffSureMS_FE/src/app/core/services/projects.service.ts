import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  AssignProjectTeamMemberDto,
  CreateProjectDto,
  ProjectDto,
  ProjectFilterRequest,
  ProjectStatus,
  UpdateProjectDto,
  UpdateProjectStatusDto,
} from '../models/projects/project.models';
import { normalizeProjectStatus } from '../utils/enum-status.util';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly service = 'projects';

  constructor(private api: ApiService) {}

  getAll(request?: ProjectFilterRequest): Observable<BaseResponse<PagedResponse<ProjectDto>>> {
    return this.api
      .get<BaseResponse<PagedResponse<ProjectDto>>>(this.service, '', request as Record<string, any>)
      .pipe(map(res => this.mapPagedResponse(res)));
  }

  getMy(request?: ProjectFilterRequest): Observable<BaseResponse<PagedResponse<ProjectDto>>> {
    return this.api
      .get<BaseResponse<PagedResponse<ProjectDto>>>(this.service, 'my', request as Record<string, any>)
      .pipe(map(res => this.mapPagedResponse(res)));
  }

  getById(id: number): Observable<BaseResponse<ProjectDto>> {
    return this.api
      .get<BaseResponse<ProjectDto>>(this.service, `${id}`)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapProject(res.data) : res.data })));
  }

  getMyById(id: number): Observable<BaseResponse<ProjectDto>> {
    return this.api
      .get<BaseResponse<ProjectDto>>(this.service, `my/${id}`)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapProject(res.data) : res.data })));
  }

  getTeamMy(request?: ProjectFilterRequest): Observable<BaseResponse<PagedResponse<ProjectDto>>> {
    return this.api
      .get<BaseResponse<PagedResponse<ProjectDto>>>(this.service, 'team/my', request as Record<string, any>)
      .pipe(map(res => this.mapPagedResponse(res)));
  }

  getTeamMyById(id: number): Observable<BaseResponse<ProjectDto>> {
    return this.api
      .get<BaseResponse<ProjectDto>>(this.service, `team/my/${id}`)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapProject(res.data) : res.data })));
  }

  create(dto: CreateProjectDto): Observable<BaseResponse<ProjectDto>> {
    return this.api
      .post<BaseResponse<ProjectDto>>(this.service, '', dto)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapProject(res.data) : res.data })));
  }

  update(id: number, dto: UpdateProjectDto): Observable<BaseResponse<ProjectDto>> {
    return this.api
      .put<BaseResponse<ProjectDto>>(this.service, `${id}`, dto)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapProject(res.data) : res.data })));
  }

  assignTeamMember(id: number, dto: AssignProjectTeamMemberDto): Observable<BaseResponse<ProjectDto>> {
    return this.api
      .post<BaseResponse<ProjectDto>>(this.service, `${id}/team-members`, dto)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapProject(res.data) : res.data })));
  }

  removeTeamMember(id: number, teamMemberId: number): Observable<BaseResponse<ProjectDto>> {
    return this.api
      .delete<BaseResponse<ProjectDto>>(this.service, `${id}/team-members/${teamMemberId}`)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapProject(res.data) : res.data })));
  }

  updateStatus(id: number, dto: UpdateProjectStatusDto): Observable<BaseResponse<ProjectDto>> {
    const status = normalizeProjectStatus(dto.status);
    const body: UpdateProjectStatusDto = { status };
    return this.api
      .patch<BaseResponse<ProjectDto>>(this.service, `${id}/status`, body)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapProject(res.data) : res.data })));
  }

  private mapPagedResponse(res: BaseResponse<PagedResponse<ProjectDto>>): BaseResponse<PagedResponse<ProjectDto>> {
    if (!res.data) {
      return res;
    }
    return {
      ...res,
      data: {
        ...res.data,
        data: (res.data.data ?? []).map(p => this.mapProject(p)),
      },
    };
  }

  private mapProject(dto: ProjectDto): ProjectDto {
    return {
      ...dto,
      status: normalizeProjectStatus(dto.status) as ProjectStatus,
    };
  }
}
