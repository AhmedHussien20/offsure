import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  CreateTeamMemberDto,
  CreateResourceManagerDto,
  CreateSalesUserDto,
  CvStorageResultDto,
  ResourceManagerRequest,
  ResourceManagerUserDto,
  SalesUserDto,
  SalesUserRequest,
  TeamMemberDto,
  TeamMemberRequest,
  TeamStructureDto,
  UpdateResourceManagerDto,
  UpdateSalesUserDto,
  UpdateTeamMemberDto,
  UpsertTeamMemberSkillDto,
  ResetTeamMemberPasswordDto,
} from '../models/team-members/team-member.models';

@Injectable({ providedIn: 'root' })
export class TeamMembersService {
  private readonly service = 'team-members';

  constructor(private api: ApiService) {}

  getAll(request?: TeamMemberRequest): Observable<BaseResponse<PagedResponse<TeamMemberDto>>> {
    return this.api.get<BaseResponse<PagedResponse<TeamMemberDto>>>(this.service, '', request as Record<string, any>);
  }

  getById(id: number): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.get<BaseResponse<TeamMemberDto>>(this.service, `${id}`);
  }

  getStructure(): Observable<BaseResponse<TeamStructureDto[]>> {
    return this.api.get<BaseResponse<TeamStructureDto[]>>(this.service, 'structure');
  }

  create(dto: CreateTeamMemberDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.post<BaseResponse<TeamMemberDto>>(this.service, '', dto);
  }

  update(id: number, dto: UpdateTeamMemberDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.put<BaseResponse<TeamMemberDto>>(this.service, `${id}`, dto);
  }

  delete(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `${id}`);
  }

  deactivate(id: number): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.patch<BaseResponse<TeamMemberDto>>(this.service, `${id}/deactivate`, {});
  }

  activate(id: number): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.patch<BaseResponse<TeamMemberDto>>(this.service, `${id}/activate`, {});
  }

  assignSkill(id: number, dto: UpsertTeamMemberSkillDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.post<BaseResponse<TeamMemberDto>>(this.service, `${id}/skills`, dto);
  }

  removeSkill(id: number, skillId: number): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.delete<BaseResponse<TeamMemberDto>>(this.service, `${id}/skills/${skillId}`);
  }

  uploadCv(id: number, file: File): Observable<BaseResponse<CvStorageResultDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postFormData<BaseResponse<CvStorageResultDto>>(this.service, `${id}/cv/upload`, formData);
  }

  getResourceManagers(
    request?: ResourceManagerRequest
  ): Observable<BaseResponse<PagedResponse<ResourceManagerUserDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ResourceManagerUserDto>>>(
      this.service,
      'resource-managers',
      request as Record<string, unknown>
    );
  }

  getResourceManagerById(id: number): Observable<BaseResponse<ResourceManagerUserDto>> {
    return this.api.get<BaseResponse<ResourceManagerUserDto>>(this.service, `resource-managers/${id}`);
  }

  createResourceManager(dto: CreateResourceManagerDto): Observable<BaseResponse<ResourceManagerUserDto>> {
    return this.api.post<BaseResponse<ResourceManagerUserDto>>(this.service, 'resource-managers', dto);
  }

  updateResourceManager(id: number, dto: UpdateResourceManagerDto): Observable<BaseResponse<ResourceManagerUserDto>> {
    return this.api.put<BaseResponse<ResourceManagerUserDto>>(this.service, `resource-managers/${id}`, dto);
  }

  deactivateResourceManager(id: number): Observable<BaseResponse<ResourceManagerUserDto>> {
    return this.api.patch<BaseResponse<ResourceManagerUserDto>>(this.service, `resource-managers/${id}/deactivate`, {});
  }

  activateResourceManager(id: number): Observable<BaseResponse<ResourceManagerUserDto>> {
    return this.api.patch<BaseResponse<ResourceManagerUserDto>>(this.service, `resource-managers/${id}/activate`, {});
  }

  deleteResourceManager(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `resource-managers/${id}`);
  }

  getSalesUsers(request?: SalesUserRequest): Observable<BaseResponse<PagedResponse<SalesUserDto>>> {
    return this.api.get<BaseResponse<PagedResponse<SalesUserDto>>>(
      this.service,
      'sales-users',
      request as Record<string, unknown>
    );
  }

  getSalesUserById(id: number): Observable<BaseResponse<SalesUserDto>> {
    return this.api.get<BaseResponse<SalesUserDto>>(this.service, `sales-users/${id}`);
  }

  createSalesUser(dto: CreateSalesUserDto): Observable<BaseResponse<SalesUserDto>> {
    return this.api.post<BaseResponse<SalesUserDto>>(this.service, 'sales-users', dto);
  }

  updateSalesUser(id: number, dto: UpdateSalesUserDto): Observable<BaseResponse<SalesUserDto>> {
    return this.api.put<BaseResponse<SalesUserDto>>(this.service, `sales-users/${id}`, dto);
  }

  deactivateSalesUser(id: number): Observable<BaseResponse<SalesUserDto>> {
    return this.api.patch<BaseResponse<SalesUserDto>>(this.service, `sales-users/${id}/deactivate`, {});
  }

  activateSalesUser(id: number): Observable<BaseResponse<SalesUserDto>> {
    return this.api.patch<BaseResponse<SalesUserDto>>(this.service, `sales-users/${id}/activate`, {});
  }

  deleteSalesUser(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `sales-users/${id}`);
  }

  resetPassword(id: number, dto: ResetTeamMemberPasswordDto): Observable<BaseResponse<object>> {
    return this.api.post<BaseResponse<object>>(this.service, `${id}/reset-password`, dto);
  }

  resetSalesUserPassword(id: number, dto: ResetTeamMemberPasswordDto): Observable<BaseResponse<object>> {
    return this.api.post<BaseResponse<object>>(this.service, `sales-users/${id}/reset-password`, dto);
  }

  resetResourceManagerPassword(id: number, dto: ResetTeamMemberPasswordDto): Observable<BaseResponse<object>> {
    return this.api.post<BaseResponse<object>>(this.service, `resource-managers/${id}/reset-password`, dto);
  }
}
