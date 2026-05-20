import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  CreateSkillCategoryDto,
  SkillCategoryDto,
  SkillCategoryRequest,
  UpdateSkillCategoryDto,
} from '../models/skills/skill.models';

@Injectable({ providedIn: 'root' })
export class SkillCategoriesService {
  private readonly service = 'skill-categories';

  constructor(private api: ApiService) {}

  getAll(request?: SkillCategoryRequest): Observable<BaseResponse<PagedResponse<SkillCategoryDto>>> {
    return this.api.get<BaseResponse<PagedResponse<SkillCategoryDto>>>(this.service, '', request as Record<string, any>);
  }

  getById(id: number): Observable<BaseResponse<SkillCategoryDto>> {
    return this.api.get<BaseResponse<SkillCategoryDto>>(this.service, `${id}`);
  }

  create(dto: CreateSkillCategoryDto): Observable<BaseResponse<SkillCategoryDto>> {
    return this.api.post<BaseResponse<SkillCategoryDto>>(this.service, '', dto);
  }

  update(id: number, dto: UpdateSkillCategoryDto): Observable<BaseResponse<SkillCategoryDto>> {
    return this.api.put<BaseResponse<SkillCategoryDto>>(this.service, `${id}`, dto);
  }

  delete(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `${id}`);
  }
}
