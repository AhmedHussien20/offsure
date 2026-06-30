export enum ProficiencyLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
  Expert = 'Expert',
}

export interface TeamMemberRequest {
  userId?: number;
  resourceManagerId?: number;
  isAvailable?: boolean;
  isActive?: boolean;
  skillId?: number;
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface ResourceManagerRequest {
  isActive?: boolean;
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface UpsertTeamMemberSkillDto {
  skillId: number;
  /** Backend expects int 1–5 */
  proficiencyLevel?: number;
  yearsOfExperience?: number;
  acquiredDate?: string;
  isEndorsed?: boolean;
  endorsementCount?: number;
}

export interface CreateTeamMemberDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  title?: string;
  yearsOfExperience?: number;
  phoneNumber?: string;
  resourceManagerId?: number;
  isAvailable?: boolean;
  hourlySalary?: number;
  skillAssignments?: UpsertTeamMemberSkillDto[];
}

export interface UpdateTeamMemberDto {
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
  yearsOfExperience?: number;
  phoneNumber?: string;
  resourceManagerId?: number;
  isAvailable?: boolean;
  hourlySalary?: number;
  skillAssignments?: UpsertTeamMemberSkillDto[];
}

export interface UpdateTeamMemberProfileDto {
  title: string;
  yearsOfExperience: number;
  phoneNumber?: string;
}

export interface UpdateTeamMemberAvailabilityDto {
  isAvailable: boolean;
}

export interface ResetTeamMemberPasswordDto {
  newPassword: string;
}

export interface CreateResourceManagerDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UpdateResourceManagerDto {
  firstName: string;
  lastName: string;
  email: string;
}

export interface ResourceManagerUserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
  isActive: boolean;
}

export interface TeamMemberSkillDto {
  id: number;
  skillId: number;
  skillName: string;
  skillCategoryName: string;
  proficiencyLevel: number;
  yearsOfExperience: number;
  acquiredDate: string | null;
  isEndorsed: boolean;
  endorsementCount: number;
}

export interface TeamMemberDto {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
  title: string;
  yearsOfExperience: number;
  cv: string | null;
  cvFileName?: string | null;
  cvDownloadUrl?: string | null;
  profilePhoto?: string | null;
  profilePhotoUrl?: string | null;
  introVideo?: string | null;
  introVideoUrl?: string | null;
  phoneNumber: string;
  resourceManagerId: number | null;
  resourceManagerName: string | null;
  isAvailable: boolean;
  isActive: boolean;
  hourlySalary: number | null;
  skillAssignments: TeamMemberSkillDto[];
  certificates?: TeamMemberCertificateDto[];
  experiences?: TeamMemberExperienceDto[];
}

export interface TeamMemberCertificateDto {
  id: number;
  name: string;
  issuer: string;
  issuedDate: string;
  expiryDate?: string | null;
}

export interface TeamMemberExperienceDto {
  id: number;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate?: string | null;
  description: string;
  displayOrder: number;
}

export interface UpsertTeamMemberCertificateDto {
  name: string;
  issuer: string;
  issuedDate: string;
  expiryDate?: string | null;
}

export interface UpsertTeamMemberExperienceDto {
  jobTitle: string;
  company: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
}

export interface TeamStructureDto {
  id: number;
  fullName: string;
  title: string;
  yearsOfExperience: number;
  isAvailable: boolean;
  teamMembers: TeamStructureDto[];
}

export interface CvStorageResultDto {
  teamMemberId: number;
  cvPath: string;
}

import { environment } from '../../../../environments/environment';

export function teamMemberDisplayName(
  member: Pick<TeamMemberDto, 'firstName' | 'lastName' | 'fullName'> | null | undefined
): string {
  if (!member) {
    return '';
  }
  const combined = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
  return combined || member.fullName?.trim() || '';
}

export function resolveStorageAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const apiRoot = environment.apiUrl.replace(/\/api\/?$/i, '');
  return `${apiRoot}${path.startsWith('/') ? path : `/${path}`}`;
}
