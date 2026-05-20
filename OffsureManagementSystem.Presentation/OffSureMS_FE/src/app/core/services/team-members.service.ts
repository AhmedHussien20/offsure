import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  CreateTeamMemberDto,
  CvStorageResultDto,
  TeamMemberDto,
  TeamMemberRequest,
  TeamStructureDto,
  UpdateTeamMemberDto,
  UpsertTeamMemberSkillDto,
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

  assignSkill(id: number, dto: UpsertTeamMemberSkillDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.post<BaseResponse<TeamMemberDto>>(this.service, `${id}/skills`, dto);
  }

  removeSkill(id: number, skillId: number): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.delete<BaseResponse<TeamMemberDto>>(this.service, `${id}/skills/${skillId}`);
  }

  generateCv(id: number): Observable<BaseResponse<CvStorageResultDto>> {
    return this.api.post<BaseResponse<CvStorageResultDto>>(this.service, `${id}/cv/generate`, {});
  }

  uploadCv(id: number, file: File): Observable<BaseResponse<CvStorageResultDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postFormData<BaseResponse<CvStorageResultDto>>(this.service, `${id}/cv/upload`, formData);
  }
}
