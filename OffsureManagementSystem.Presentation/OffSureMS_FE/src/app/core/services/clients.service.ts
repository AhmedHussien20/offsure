import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  ClientDto,
  ClientFilterRequest,
  ClientServiceRequestSummaryDto,
  CreateClientDto,
  CreateClientMemberDto,
  UpdateClientProfileDto,
} from '../models/clients/client.models';
import {
  ClientTeamMemberBrowseRequest,
  ClientTeamMemberCardDto,
  ClientTeamMemberDetailDto,
} from '../models/clients/client-team-member.models';
import { projectStatusKey, serviceRequestStatusKey } from '../utils/enum-status.util';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly service = 'clients';

  constructor(private api: ApiService) {}

  getAll(request?: ClientFilterRequest): Observable<BaseResponse<PagedResponse<ClientDto>>> {
    return this.api
      .get<BaseResponse<PagedResponse<ClientDto>>>(this.service, '', request as Record<string, any>)
      .pipe(map(res => this.mapPagedClients(res)));
  }

  create(dto: CreateClientDto): Observable<BaseResponse<ClientDto>> {
    return this.api
      .post<BaseResponse<ClientDto>>(this.service, '', dto)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapClient(res.data) : res.data })));
  }

  createOrganizationMember(
    ownerClientId: number,
    dto: CreateClientMemberDto
  ): Observable<BaseResponse<ClientDto>> {
    return this.api
      .post<BaseResponse<ClientDto>>(this.service, `${ownerClientId}/members`, dto)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapClient(res.data) : res.data })));
  }

  getOrganizationMembers(ownerClientId: number): Observable<BaseResponse<ClientDto[]>> {
    return this.api
      .get<BaseResponse<ClientDto[]>>(this.service, `${ownerClientId}/members`)
      .pipe(
        map(res => ({
          ...res,
          data: (res.data ?? []).map(c => this.mapClient(c)),
        }))
      );
  }

  /** Owner portal: organization members with request/project counts. */
  getMyOrganizationMembers(
    request?: Pick<ClientFilterRequest, 'searchKey' | 'pageIndex' | 'pageSize'>
  ): Observable<BaseResponse<PagedResponse<ClientDto>>> {
    return this.api
      .get<BaseResponse<PagedResponse<ClientDto>>>(
        this.service,
        'organization-members',
        request as Record<string, unknown>
      )
      .pipe(map(res => this.mapPagedClients(res)));
  }

  getById(id: number): Observable<BaseResponse<ClientDto>> {
    return this.api
      .get<BaseResponse<ClientDto>>(this.service, `${id}`)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapClient(res.data) : res.data })));
  }

  getProfile(): Observable<BaseResponse<ClientDto>> {
    return this.api
      .get<BaseResponse<ClientDto>>(this.service, 'profile')
      .pipe(map(res => ({ ...res, data: res.data ? this.mapClient(res.data) : res.data })));
  }

  getProfileRecentRequests(limit = 5): Observable<BaseResponse<ClientServiceRequestSummaryDto[]>> {
    return this.api
      .get<BaseResponse<ClientServiceRequestSummaryDto[]>>(this.service, 'profile/recent-requests', {
        limit,
      })
      .pipe(map(res => this.mapRecentRequestsResponse(res)));
  }

  getRecentRequestsByClientId(
    clientId: number,
    limit = 5
  ): Observable<BaseResponse<ClientServiceRequestSummaryDto[]>> {
    return this.api
      .get<BaseResponse<ClientServiceRequestSummaryDto[]>>(
        this.service,
        `${clientId}/recent-requests`,
        { limit }
      )
      .pipe(map(res => this.mapRecentRequestsResponse(res)));
  }

  updateProfile(dto: UpdateClientProfileDto): Observable<BaseResponse<ClientDto>> {
    return this.api
      .put<BaseResponse<ClientDto>>(this.service, 'profile', dto)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapClient(res.data) : res.data })));
  }

  deactivate(id: number, includeMembers = false): Observable<BaseResponse<ClientDto>> {
    const query = includeMembers ? '?includeMembers=true' : '';
    return this.api
      .patch<BaseResponse<ClientDto>>(this.service, `${id}/deactivate${query}`, {})
      .pipe(map(res => ({ ...res, data: res.data ? this.mapClient(res.data) : res.data })));
  }

  activate(id: number): Observable<BaseResponse<ClientDto>> {
    return this.api
      .patch<BaseResponse<ClientDto>>(this.service, `${id}/activate`, {})
      .pipe(map(res => ({ ...res, data: res.data ? this.mapClient(res.data) : res.data })));
  }

  delete(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `${id}`);
  }

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

  browseShowcaseTeamMembers(
    request?: ClientTeamMemberBrowseRequest
  ): Observable<BaseResponse<PagedResponse<ClientTeamMemberCardDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ClientTeamMemberCardDto>>>(
      this.service,
      'showcase/team-members',
      request as Record<string, unknown>
    );
  }

  getShowcaseTeamMemberDetail(id: number): Observable<BaseResponse<ClientTeamMemberDetailDto>> {
    return this.api.get<BaseResponse<ClientTeamMemberDetailDto>>(
      this.service,
      `showcase/team-members/${id}`
    );
  }

  private mapPagedClients(res: BaseResponse<PagedResponse<ClientDto>>): BaseResponse<PagedResponse<ClientDto>> {
    if (!res.data) {
      return res;
    }
    return {
      ...res,
      data: {
        ...res.data,
        data: (res.data.data ?? []).map(c => this.mapClient(c)),
      },
    };
  }

  private mapClient(client: ClientDto): ClientDto {
    return {
      ...client,
      serviceRequests: (client.serviceRequests ?? []).map(r => this.mapServiceRequestSummary(r)),
    };
  }

  private mapRecentRequestsResponse(
    res: BaseResponse<ClientServiceRequestSummaryDto[]>
  ): BaseResponse<ClientServiceRequestSummaryDto[]> {
    return {
      ...res,
      data: (res.data ?? []).map(r => this.mapServiceRequestSummary(r)),
    };
  }

  private mapServiceRequestSummary(
    summary: ClientServiceRequestSummaryDto
  ): ClientServiceRequestSummaryDto {
    return {
      ...summary,
      status: serviceRequestStatusKey(summary.status),
      projectStatus: summary.projectStatus
        ? projectStatusKey(summary.projectStatus)
        : summary.projectStatus,
    };
  }
}
