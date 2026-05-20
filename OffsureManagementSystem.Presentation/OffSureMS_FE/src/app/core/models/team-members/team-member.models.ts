export enum ProficiencyLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
  Expert = 'Expert',
}

export interface TeamMemberRequest {
  userId?: number;
  leaderId?: number;
  isAvailable?: boolean;
  skillId?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface UpsertTeamMemberSkillDto {
  skillId: number;
  proficiencyLevel?: ProficiencyLevel;
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
  leaderId?: number;
  isAvailable?: boolean;
  skillAssignments?: UpsertTeamMemberSkillDto[];
}

export interface UpdateTeamMemberDto {
  firstName: string;
  lastName: string;
  title?: string;
  yearsOfExperience?: number;
  phoneNumber?: string;
  leaderId?: number;
  isAvailable?: boolean;
  skillAssignments?: UpsertTeamMemberSkillDto[];
}

export interface TeamMemberSkillDto {
  id: number;
  skillId: number;
  skillName: string;
  skillCategoryName: string;
  proficiencyLevel: ProficiencyLevel;
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
  phoneNumber: string;
  leaderId: number | null;
  leaderName: string | null;
  isAvailable: boolean;
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
