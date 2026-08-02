import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  AddPortfolioDto,
  LinkPortfolioToServiceDto,
  PortfolioDto,
  PortfolioFilterRequest,
  PortfolioServiceSummaryDto,
  UpdatePortfolioDto,
  UpdatePortfolioImageDto,
} from '../models/portfolios/portfolio.models';

@Injectable({ providedIn: 'root' })
export class PortfoliosService {
  private readonly service = 'portfolios';

  constructor(private api: ApiService) {}

  getAll(request?: PortfolioFilterRequest): Observable<BaseResponse<PagedResponse<PortfolioDto>>> {
    return this.api.get<BaseResponse<PagedResponse<PortfolioDto>>>(this.service, '', request as Record<string, any>);
  }

  getServiceSummary(): Observable<BaseResponse<PortfolioServiceSummaryDto[]>> {
    return this.api.get<BaseResponse<PortfolioServiceSummaryDto[]>>(this.service, 'service-summary');
  }

  getById(id: number, includeUnpublished = false): Observable<BaseResponse<PortfolioDto>> {
    return this.api.get<BaseResponse<PortfolioDto>>(this.service, `${id}`, {
      includeUnpublished,
    });
  }

  create(dto: AddPortfolioDto): Observable<BaseResponse<PortfolioDto>> {
    return this.api.post<BaseResponse<PortfolioDto>>(this.service, '', dto);
  }

  update(id: number, dto: UpdatePortfolioDto): Observable<BaseResponse<PortfolioDto>> {
    return this.api.put<BaseResponse<PortfolioDto>>(this.service, `${id}`, dto);
  }

  delete(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `${id}`);
  }

  uploadImage(
    id: number,
    file: File,
    imageAltText?: string,
    displayOrder: number = 0
  ): Observable<BaseResponse<PortfolioDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (imageAltText) formData.append('imageAltText', imageAltText);
    formData.append('displayOrder', displayOrder.toString());
    return this.api.postFormData<BaseResponse<PortfolioDto>>(this.service, `${id}/images`, formData);
  }

  linkToService(id: number, dto: LinkPortfolioToServiceDto): Observable<BaseResponse<PortfolioDto>> {
    return this.api.patch<BaseResponse<PortfolioDto>>(this.service, `${id}/service`, dto);
  }

  setImageActive(
    portfolioId: number,
    imageId: number,
    dto: UpdatePortfolioImageDto
  ): Observable<BaseResponse<PortfolioDto>> {
    return this.api.patch<BaseResponse<PortfolioDto>>(
      this.service,
      `${portfolioId}/images/${imageId}/active`,
      dto
    );
  }
}
