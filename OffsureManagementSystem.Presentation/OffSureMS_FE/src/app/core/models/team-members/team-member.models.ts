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
  skillId?: number;
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface ResourceManagerRequest {
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

export interface ResourceManagerUserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
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
  /** Derived display name from firstName + lastName (API convenience). */
  fullName: string;
  title: string;
  yearsOfExperience: number;
  cv: string | null;
  phoneNumber: string;
  resourceManagerId: number | null;
  resourceManagerName: string | null;
  isAvailable: boolean;
  hourlySalary: number | null;
  skillAssignments: TeamMemberSkillDto[];
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

export function teamMemberDisplayName(
  member: Pick<TeamMemberDto, 'firstName' | 'lastName' | 'fullName'> | null | undefined
): string {
  if (!member) {
    return '';
  }
  const combined = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
  return combined || member.fullName?.trim() || '';
}
