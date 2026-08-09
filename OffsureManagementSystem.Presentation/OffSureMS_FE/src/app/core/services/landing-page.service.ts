import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import {
  BulkUpdateLandingPageSectionsDto,
  LandingPageSectionDto,
  UpdateLandingPageSectionDto,
} from '../models/landing/landing-page.models';

@Injectable({ providedIn: 'root' })
export class LandingPageService {
  private readonly service = 'landing-page';

  constructor(private api: ApiService) {}

  getPublic(): Observable<BaseResponse<LandingPageSectionDto[]>> {
    return this.api.get<BaseResponse<LandingPageSectionDto[]>>(this.service, '');
  }

  getAdmin(): Observable<BaseResponse<LandingPageSectionDto[]>> {
    return this.api.get<BaseResponse<LandingPageSectionDto[]>>(this.service, 'admin');
  }

  getByKey(sectionKey: string): Observable<BaseResponse<LandingPageSectionDto>> {
    return this.api.get<BaseResponse<LandingPageSectionDto>>(this.service, sectionKey);
  }

  updateSection(
    sectionKey: string,
    dto: UpdateLandingPageSectionDto
  ): Observable<BaseResponse<LandingPageSectionDto>> {
    return this.api.put<BaseResponse<LandingPageSectionDto>>(this.service, sectionKey, dto);
  }

  saveAll(dto: BulkUpdateLandingPageSectionsDto): Observable<BaseResponse<LandingPageSectionDto[]>> {
    return this.api.put<BaseResponse<LandingPageSectionDto[]>>(this.service, 'bulk', dto);
  }
}
