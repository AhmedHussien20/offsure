import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import { PagedResponse } from '../models/paged-response.model';
import {
  CreateSkillDto,
  SkillDto,
  SkillRequest,
  UpdateSkillDto,
} from '../models/skills/skill.models';

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly service = 'skills';

  constructor(private api: ApiService) {}

  getAll(request?: SkillRequest): Observable<BaseResponse<PagedResponse<SkillDto>>> {
    return this.api.get<BaseResponse<PagedResponse<SkillDto>>>(this.service, '', request as Record<string, any>);
  }

  getById(id: number): Observable<BaseResponse<SkillDto>> {
    return this.api.get<BaseResponse<SkillDto>>(this.service, `${id}`);
  }

  create(dto: CreateSkillDto): Observable<BaseResponse<SkillDto>> {
    return this.api.post<BaseResponse<SkillDto>>(this.service, '', dto);
  }

  update(id: number, dto: UpdateSkillDto): Observable<BaseResponse<SkillDto>> {
    return this.api.put<BaseResponse<SkillDto>>(this.service, `${id}`, dto);
  }

  delete(id: number): Observable<BaseResponse<object>> {
    return this.api.delete<BaseResponse<object>>(this.service, `${id}`);
  }
}
