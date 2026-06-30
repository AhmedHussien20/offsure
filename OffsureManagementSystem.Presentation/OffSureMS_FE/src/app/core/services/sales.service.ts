import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  ClientTeamMemberBrowseRequest,
  ClientTeamMemberCardDto,
  ClientTeamMemberDetailDto,
} from '../models/clients/client-team-member.models';
import { CreateClientDto, ClientDto } from '../models/clients/client.models';
import { ProjectFilterRequest, SalesProjectSummaryDto } from '../models/projects/project.models';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly service = 'sales';

  constructor(private api: ApiService) {}

  browseTeamMembers(
    request?: ClientTeamMemberBrowseRequest
  ): Observable<BaseResponse<PagedResponse<ClientTeamMemberCardDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ClientTeamMemberCardDto>>>(
      this.service,
      'team-members',
      request as Record<string, unknown>
    );
  }

  getTeamMemberDetail(id: number): Observable<BaseResponse<ClientTeamMemberDetailDto>> {
    return this.api.get<BaseResponse<ClientTeamMemberDetailDto>>(this.service, `team-members/${id}`);
  }

  getMyProjects(
    request?: ProjectFilterRequest
  ): Observable<BaseResponse<PagedResponse<SalesProjectSummaryDto>>> {
    return this.api.get<BaseResponse<PagedResponse<SalesProjectSummaryDto>>>(
      this.service,
      'projects',
      request as Record<string, unknown>
    );
  }

  getClients(request?: Record<string, unknown>): Observable<BaseResponse<PagedResponse<ClientDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ClientDto>>>(
      this.service,
      'clients',
      request
    );
  }

  getMyProjectById(id: number): Observable<BaseResponse<SalesProjectSummaryDto>> {
    return this.api.get<BaseResponse<SalesProjectSummaryDto>>(this.service, `projects/${id}`);
  }

  createClient(dto: CreateClientDto): Observable<BaseResponse<ClientDto>> {
    return this.api.post<BaseResponse<ClientDto>>(this.service, 'clients', dto);
  }
}
