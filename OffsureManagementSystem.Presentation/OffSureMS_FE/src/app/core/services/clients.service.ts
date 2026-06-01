import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  ClientDto,
  ClientFilterRequest,
  ClientServiceRequestSummaryDto,
  UpdateClientProfileDto,
} from '../models/clients/client.models';
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

  updateProfile(dto: UpdateClientProfileDto): Observable<BaseResponse<ClientDto>> {
    return this.api
      .put<BaseResponse<ClientDto>>(this.service, 'profile', dto)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapClient(res.data) : res.data })));
  }

  deactivate(id: number): Observable<BaseResponse<ClientDto>> {
    return this.api
      .patch<BaseResponse<ClientDto>>(this.service, `${id}/deactivate`, {})
      .pipe(map(res => ({ ...res, data: res.data ? this.mapClient(res.data) : res.data })));
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
