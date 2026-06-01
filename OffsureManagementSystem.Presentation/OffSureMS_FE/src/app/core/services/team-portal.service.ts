import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import {
  CvStorageResultDto,
  TeamMemberDto,
  UpdateTeamMemberAvailabilityDto,
  UpdateTeamMemberProfileDto,
  UpsertTeamMemberSkillDto,
} from '../models/team-members/team-member.models';

@Injectable({ providedIn: 'root' })
export class TeamPortalService {
  private readonly service = 'team-members';

  constructor(private api: ApiService) {}

  getProfile(): Observable<BaseResponse<TeamMemberDto>> {
    return this.api
      .get<BaseResponse<TeamMemberDto>>(this.service, 'profile')
      .pipe(map(res => ({ ...res, data: res.data ?? null })));
  }

  updateProfile(dto: UpdateTeamMemberProfileDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.put<BaseResponse<TeamMemberDto>>(this.service, 'profile', dto);
  }

  updateAvailability(dto: UpdateTeamMemberAvailabilityDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.patch<BaseResponse<TeamMemberDto>>(this.service, 'profile/availability', dto);
  }

  assignSkill(dto: UpsertTeamMemberSkillDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.post<BaseResponse<TeamMemberDto>>(this.service, 'profile/skills', dto);
  }

  removeSkill(skillId: number): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.delete<BaseResponse<TeamMemberDto>>(this.service, `profile/skills/${skillId}`);
  }

  generateCv(): Observable<BaseResponse<CvStorageResultDto>> {
    return this.api.post<BaseResponse<CvStorageResultDto>>(this.service, 'profile/cv/generate', {});
  }

  uploadCv(file: File): Observable<BaseResponse<CvStorageResultDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postFormData<BaseResponse<CvStorageResultDto>>(
      this.service,
      'profile/cv/upload',
      formData
    );
  }
}
