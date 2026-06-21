import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  AssignProjectTeamMemberDto,
  ProjectDto,
  ProjectFilterRequest,
  UpdateProjectDeliveryDto,
} from '../models/projects/project.models';
import {
  CreateTeamMemberDto,
  TeamMemberDto,
  TeamMemberRequest,
  UpdateTeamMemberDto,
  UpsertTeamMemberSkillDto,
} from '../models/team-members/team-member.models';

@Injectable({ providedIn: 'root' })
export class ResourceManagerPortalService {
  private readonly service = 'resource-manager';

  constructor(private api: ApiService) {}

  getTeamMembers(request?: TeamMemberRequest): Observable<BaseResponse<PagedResponse<TeamMemberDto>>> {
    return this.api.get<BaseResponse<PagedResponse<TeamMemberDto>>>(
      this.service,
      'team-members',
      request as Record<string, any>
    );
  }

  getTeamMemberById(id: number): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.get<BaseResponse<TeamMemberDto>>(this.service, `team-members/${id}`);
  }

  createTeamMember(dto: CreateTeamMemberDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.post<BaseResponse<TeamMemberDto>>(this.service, 'team-members', dto);
  }

  updateTeamMember(id: number, dto: UpdateTeamMemberDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.put<BaseResponse<TeamMemberDto>>(this.service, `team-members/${id}`, dto);
  }

  deleteTeamMember(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `team-members/${id}`);
  }

  assignSkill(id: number, dto: UpsertTeamMemberSkillDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.post<BaseResponse<TeamMemberDto>>(this.service, `team-members/${id}/skills`, dto);
  }

  removeSkill(id: number, skillId: number): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.delete<BaseResponse<TeamMemberDto>>(this.service, `team-members/${id}/skills/${skillId}`);
  }

  getProjects(request?: ProjectFilterRequest): Observable<BaseResponse<PagedResponse<ProjectDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ProjectDto>>>(
      this.service,
      'projects',
      request as Record<string, any>
    );
  }

  getProjectById(id: number): Observable<BaseResponse<ProjectDto>> {
    return this.api.get<BaseResponse<ProjectDto>>(this.service, `projects/${id}`);
  }

  assignTeamMember(projectId: number, dto: AssignProjectTeamMemberDto): Observable<BaseResponse<ProjectDto>> {
    return this.api.post<BaseResponse<ProjectDto>>(this.service, `projects/${projectId}/team-members`, dto);
  }

  updateDelivery(projectId: number, dto: UpdateProjectDeliveryDto): Observable<BaseResponse<ProjectDto>> {
    return this.api.patch<BaseResponse<ProjectDto>>(this.service, `projects/${projectId}/delivery`, dto);
  }

  resetTeamMemberPassword(id: number, dto: { newPassword: string }): Observable<BaseResponse<object>> {
    return this.api.post<BaseResponse<object>>(this.service, `team-members/${id}/reset-password`, dto);
  }

  removeAssignment(projectId: number, assignmentId: number): Observable<BaseResponse<ProjectDto>> {
    return this.api
      .delete<BaseResponse<ProjectDto>>(this.service, `projects/${projectId}/assignments/${assignmentId}`)
      .pipe(map(res => ({ ...res, data: res.data ?? undefined })));
  }
}
