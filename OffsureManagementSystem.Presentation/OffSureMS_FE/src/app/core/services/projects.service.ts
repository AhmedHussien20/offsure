import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  AssignProjectTeamMemberDto,
  CreateProjectDto,
  ProjectDto,
  ProjectFilterRequest,
  UpdateProjectDto,
  UpdateProjectStatusDto,
} from '../models/projects/project.models';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly service = 'projects';

  constructor(private api: ApiService) {}

  getAll(request?: ProjectFilterRequest): Observable<BaseResponse<PagedResponse<ProjectDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ProjectDto>>>(this.service, '', request as Record<string, any>);
  }

  getById(id: number): Observable<BaseResponse<ProjectDto>> {
    return this.api.get<BaseResponse<ProjectDto>>(this.service, `${id}`);
  }

  create(dto: CreateProjectDto): Observable<BaseResponse<ProjectDto>> {
    return this.api.post<BaseResponse<ProjectDto>>(this.service, '', dto);
  }

  update(id: number, dto: UpdateProjectDto): Observable<BaseResponse<ProjectDto>> {
    return this.api.put<BaseResponse<ProjectDto>>(this.service, `${id}`, dto);
  }

  assignTeamMember(id: number, dto: AssignProjectTeamMemberDto): Observable<BaseResponse<ProjectDto>> {
    return this.api.post<BaseResponse<ProjectDto>>(this.service, `${id}/team-members`, dto);
  }

  removeTeamMember(id: number, teamMemberId: number): Observable<BaseResponse<ProjectDto>> {
    return this.api.delete<BaseResponse<ProjectDto>>(this.service, `${id}/team-members/${teamMemberId}`);
  }

  updateStatus(id: number, dto: UpdateProjectStatusDto): Observable<BaseResponse<ProjectDto>> {
    return this.api.patch<BaseResponse<ProjectDto>>(this.service, `${id}/status`, dto);
  }
}
