// --- Skill Category ---

export interface SkillCategoryRequest {
  isActive?: boolean;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateSkillCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateSkillCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface SkillCategoryDto {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  skillsCount: number;
}

// --- Skill ---

export interface SkillRequest {
  skillCategoryId?: number;
  isActive?: boolean;
  searchKey?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateSkillDto {
  name: string;
  description?: string;
  skillCategoryId: number;
  isActive?: boolean;
}

export interface UpdateSkillDto {
  name: string;
  description?: string;
  skillCategoryId: number;
  isActive?: boolean;
}

export interface SkillDto {
  id: number;
  name: string;
  description: string;
  skillCategoryId: number;
  skillCategoryName: string;
  isActive: boolean;
  assignedTeamMembersCount: number;
}
