import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  CreateServiceDto,
  PublicServiceFilterRequest,
  ServiceDto,
  ServiceFilterRequest,
  UpdateServiceDto,
  UpdateServiceVisibilityDto,
} from '../models/services/service.models';

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private readonly service = 'services';

  constructor(private api: ApiService) {}

  getAll(request?: ServiceFilterRequest): Observable<BaseResponse<PagedResponse<ServiceDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ServiceDto>>>(this.service, '', request as Record<string, any>);
  }

  getPublic(request?: PublicServiceFilterRequest): Observable<BaseResponse<PagedResponse<ServiceDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ServiceDto>>>(this.service, 'public', request as Record<string, any>);
  }

  getById(id: number): Observable<BaseResponse<ServiceDto>> {
    return this.api.get<BaseResponse<ServiceDto>>(this.service, `${id}`);
  }

  create(dto: CreateServiceDto): Observable<BaseResponse<ServiceDto>> {
    return this.api.post<BaseResponse<ServiceDto>>(this.service, '', dto);
  }

  update(id: number, dto: UpdateServiceDto): Observable<BaseResponse<ServiceDto>> {
    return this.api.put<BaseResponse<ServiceDto>>(this.service, `${id}`, dto);
  }

  setVisibility(id: number, dto: UpdateServiceVisibilityDto): Observable<BaseResponse<ServiceDto>> {
    return this.api.patch<BaseResponse<ServiceDto>>(this.service, `${id}/visibility`, dto);
  }

  delete(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `${id}`);
  }
}
