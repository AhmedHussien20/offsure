import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseResponse } from '../models/base.response';
import {
  CvStorageResultDto,
  TeamMemberDto,
  UpdateTeamMemberAvailabilityDto,
  UpdateTeamMemberProfileDto,
  UpsertTeamMemberCertificateDto,
  UpsertTeamMemberExperienceDto,
  UpsertTeamMemberSkillDto,
} from '../models/team-members/team-member.models';
import { IntroVideoSettingsDto } from '../models/team-members/intro-video.models';

@Injectable({ providedIn: 'root' })
export class TeamPortalService {
  private readonly service = 'team-members';

  constructor(private api: ApiService) {}

  getProfile(): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.get<BaseResponse<TeamMemberDto>>(this.service, 'profile');
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

  uploadCv(file: File): Observable<BaseResponse<CvStorageResultDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postFormData<BaseResponse<CvStorageResultDto>>(
      this.service,
      'profile/cv/upload',
      formData
    );
  }

  deleteCv(): Observable<BaseResponse<unknown>> {
    return this.api.delete<BaseResponse<unknown>>(this.service, 'profile/cv');
  }

  downloadCv(): Observable<Blob> {
    return this.api.getBlob(this.service, 'profile/cv/download');
  }

  uploadProfilePhoto(file: File): Observable<BaseResponse<TeamMemberDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postFormData<BaseResponse<TeamMemberDto>>(this.service, 'profile/photo', formData);
  }

  addCertificate(dto: UpsertTeamMemberCertificateDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.post<BaseResponse<TeamMemberDto>>(this.service, 'profile/certificates', dto);
  }

  updateCertificate(
    certificateId: number,
    dto: UpsertTeamMemberCertificateDto
  ): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.put<BaseResponse<TeamMemberDto>>(
      this.service,
      `profile/certificates/${certificateId}`,
      dto
    );
  }

  deleteCertificate(certificateId: number): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.delete<BaseResponse<TeamMemberDto>>(
      this.service,
      `profile/certificates/${certificateId}`
    );
  }

  addExperience(dto: UpsertTeamMemberExperienceDto): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.post<BaseResponse<TeamMemberDto>>(this.service, 'profile/experiences', dto);
  }

  updateExperience(
    experienceId: number,
    dto: UpsertTeamMemberExperienceDto
  ): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.put<BaseResponse<TeamMemberDto>>(
      this.service,
      `profile/experiences/${experienceId}`,
      dto
    );
  }

  deleteExperience(experienceId: number): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.delete<BaseResponse<TeamMemberDto>>(
      this.service,
      `profile/experiences/${experienceId}`
    );
  }

  getIntroVideoSettings(): Observable<BaseResponse<IntroVideoSettingsDto>> {
    return this.api.get<BaseResponse<IntroVideoSettingsDto>>(this.service, 'profile/intro-video/settings');
  }

  uploadIntroVideo(file: File): Observable<BaseResponse<TeamMemberDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postFormData<BaseResponse<TeamMemberDto>>(
      this.service,
      'profile/intro-video',
      formData
    );
  }

  deleteIntroVideo(): Observable<BaseResponse<TeamMemberDto>> {
    return this.api.delete<BaseResponse<TeamMemberDto>>(this.service, 'profile/intro-video');
  }
}
