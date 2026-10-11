import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  CreateTeamDto,
  TeamCatalogDto,
  TeamDto,
  TeamMemberOptionDto,
  TeamRequest,
  UpdateTeamDto,
} from '../models/teams/team.models';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly service = 'teams';

  constructor(private api: ApiService) {}

  getCatalog(searchKey?: string): Observable<BaseResponse<TeamCatalogDto>> {
    return this.api.get<BaseResponse<TeamCatalogDto>>(this.service, 'catalog', { searchKey });
  }

  getAll(request?: TeamRequest): Observable<BaseResponse<PagedResponse<TeamDto>>> {
    return this.api.get<BaseResponse<PagedResponse<TeamDto>>>(this.service, '', request as Record<string, any>);
  }

  getById(id: number): Observable<BaseResponse<TeamDto>> {
    return this.api.get<BaseResponse<TeamDto>>(this.service, `${id}`);
  }

  create(dto: CreateTeamDto): Observable<BaseResponse<TeamDto>> {
    return this.api.post<BaseResponse<TeamDto>>(this.service, '', dto);
  }

  update(id: number, dto: UpdateTeamDto): Observable<BaseResponse<TeamDto>> {
    return this.api.put<BaseResponse<TeamDto>>(this.service, `${id}`, dto);
  }

  delete(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `${id}`);
  }

  getMemberOptions(): Observable<BaseResponse<TeamMemberOptionDto[]>> {
    return this.api.get<BaseResponse<TeamMemberOptionDto[]>>(this.service, 'member-options');
  }

  setMembers(id: number, teamMemberIds: number[]): Observable<BaseResponse<TeamDto>> {
    return this.api.put<BaseResponse<TeamDto>>(this.service, `${id}/members`, { teamMemberIds });
  }

  uploadCover(id: number, file: File): Observable<BaseResponse<TeamDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postFormData<BaseResponse<TeamDto>>(this.service, `${id}/cover`, formData);
  }

  removeCover(id: number): Observable<BaseResponse<TeamDto>> {
    return this.api.delete<BaseResponse<TeamDto>>(this.service, `${id}/cover`);
  }
}
