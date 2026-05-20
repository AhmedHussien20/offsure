import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  CreateServiceCategoryDto,
  ServiceCategoryDto,
  ServiceCategoryRequest,
  UpdateServiceCategoryDto,
} from '../models/services/service.models';

@Injectable({ providedIn: 'root' })
export class ServiceCategoriesService {
  private readonly service = 'service-categories';

  constructor(private api: ApiService) {}

  getAll(request?: ServiceCategoryRequest): Observable<BaseResponse<PagedResponse<ServiceCategoryDto>>> {
    return this.api.get<BaseResponse<PagedResponse<ServiceCategoryDto>>>(this.service, '', request as Record<string, any>);
  }

  getById(id: number): Observable<BaseResponse<ServiceCategoryDto>> {
    return this.api.get<BaseResponse<ServiceCategoryDto>>(this.service, `${id}`);
  }

  create(dto: CreateServiceCategoryDto): Observable<BaseResponse<ServiceCategoryDto>> {
    return this.api.post<BaseResponse<ServiceCategoryDto>>(this.service, '', dto);
  }

  update(id: number, dto: UpdateServiceCategoryDto): Observable<BaseResponse<ServiceCategoryDto>> {
    return this.api.put<BaseResponse<ServiceCategoryDto>>(this.service, `${id}`, dto);
  }

  delete(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `${id}`);
  }
}
