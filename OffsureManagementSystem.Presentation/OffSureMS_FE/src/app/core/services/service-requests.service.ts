import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  CreateServiceRequestDto,
  ServiceRequestDto,
  ServiceRequestFilterRequest,
  UpdateServiceRequestStatusDto,
} from '../models/services/service.models';

@Injectable({ providedIn: 'root' })
export class ServiceRequestsService {
  private readonly service = 'service-requests';

  constructor(private api: ApiService) {}

  getAll(request?: ServiceRequestFilterRequest): Observable<BaseResponse<PagedResponse<ServiceRequestDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ServiceRequestDto>>>(this.service, '', request as Record<string, any>);
  }

  getClientRequests(
    clientId: number,
    request?: ServiceRequestFilterRequest
  ): Observable<BaseResponse<PagedResponse<ServiceRequestDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ServiceRequestDto>>>(
      this.service,
      `client/${clientId}`,
      request as Record<string, any>
    );
  }

  getById(id: number): Observable<BaseResponse<ServiceRequestDto>> {
    return this.api.get<BaseResponse<ServiceRequestDto>>(this.service, `${id}`);
  }

  create(dto: CreateServiceRequestDto): Observable<BaseResponse<ServiceRequestDto>> {
    return this.api.post<BaseResponse<ServiceRequestDto>>(this.service, '', dto);
  }

  updateStatus(id: number, dto: UpdateServiceRequestStatusDto): Observable<BaseResponse<ServiceRequestDto>> {
    return this.api.patch<BaseResponse<ServiceRequestDto>>(this.service, `${id}/status`, dto);
  }

  cancel(id: number): Observable<BaseResponse<ServiceRequestDto>> {
    return this.api.patch<BaseResponse<ServiceRequestDto>>(this.service, `${id}/cancel`, {});
  }
}
