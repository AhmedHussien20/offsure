import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  CreateServiceRequestDto,
  ServiceRequestDto,
  ServiceRequestFilterRequest,
  ServiceRequestStatus,
  UpdateServiceRequestStatusDto,
} from '../models/services/service.models';
import { normalizeServiceRequestStatus } from '../utils/enum-status.util';

@Injectable({ providedIn: 'root' })
export class ServiceRequestsService {
  private readonly service = 'service-requests';

  constructor(private api: ApiService) {}

  getAll(request?: ServiceRequestFilterRequest): Observable<BaseResponse<PagedResponse<ServiceRequestDto>>> {
    return this.api
      .get<BaseResponse<PagedResponse<ServiceRequestDto>>>(this.service, '', request as Record<string, any>)
      .pipe(map(res => this.mapPagedResponse(res)));
  }

  getClientRequests(
    clientId: number,
    request?: ServiceRequestFilterRequest
  ): Observable<BaseResponse<PagedResponse<ServiceRequestDto>>> {
    return this.api
      .get<BaseResponse<PagedResponse<ServiceRequestDto>>>(
        this.service,
        `client/${clientId}`,
        request as Record<string, any>
      )
      .pipe(map(res => this.mapPagedResponse(res)));
  }

  getById(id: number): Observable<BaseResponse<ServiceRequestDto>> {
    return this.api
      .get<BaseResponse<ServiceRequestDto>>(this.service, `${id}`)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapRequest(res.data) : res.data })));
  }

  create(dto: CreateServiceRequestDto): Observable<BaseResponse<ServiceRequestDto>> {
    return this.api
      .post<BaseResponse<ServiceRequestDto>>(this.service, '', dto)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapRequest(res.data) : res.data })));
  }

  updateStatus(id: number, dto: UpdateServiceRequestStatusDto): Observable<BaseResponse<ServiceRequestDto>> {
    const status = normalizeServiceRequestStatus(dto.status);
    const body: UpdateServiceRequestStatusDto = { status };
    return this.api
      .patch<BaseResponse<ServiceRequestDto>>(this.service, `${id}/status`, body)
      .pipe(map(res => ({ ...res, data: res.data ? this.mapRequest(res.data) : res.data })));
  }

  cancel(id: number): Observable<BaseResponse<ServiceRequestDto>> {
    return this.api
      .patch<BaseResponse<ServiceRequestDto>>(this.service, `${id}/cancel`, {})
      .pipe(map(res => ({ ...res, data: res.data ? this.mapRequest(res.data) : res.data })));
  }

  private mapPagedResponse(
    res: BaseResponse<PagedResponse<ServiceRequestDto>>
  ): BaseResponse<PagedResponse<ServiceRequestDto>> {
    if (!res.data) {
      return res;
    }
    return {
      ...res,
      data: {
        ...res.data,
        data: (res.data.data ?? []).map(r => this.mapRequest(r)),
      },
    };
  }

  private mapRequest(dto: ServiceRequestDto): ServiceRequestDto {
    return {
      ...dto,
      status: normalizeServiceRequestStatus(dto.status) as ServiceRequestStatus,
    };
  }
}
