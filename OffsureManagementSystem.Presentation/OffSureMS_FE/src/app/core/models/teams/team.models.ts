export interface TeamRequest {
  pageIndex?: number;
  pageSize?: number;
  searchKey?: string;
  isActive?: boolean;
}

export interface CreateTeamDto {
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  teamMemberIds?: number[];
}

export type UpdateTeamDto = CreateTeamDto;

export interface TeamDto {
  id: number;
  name: string;
  description: string;
  /** Uploaded cover; null means the generated cover is shown. */
  coverImageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  memberCount: number;
  /** Most common skills among the team's members, most frequent first. */
  topSkills: string[];
}

export interface TeamMemberOptionDto {
  id: number;
  fullName: string;
  title: string;
  profilePhotoUrl?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  skills: string[];
}

/** Same rule as the API: skills shared by the most members first, then by name. */
export function topTeamSkills(members: TeamMemberOptionDto[], limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const member of members) {
    for (const skill of new Set(member.skills ?? [])) {
      counts.set(skill, (counts.get(skill) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

export interface TeamCatalogDto {
  teams: TeamCatalogCardDto[];
  /** Active specialists not shown under any active team. */
  unassignedCount: number;
  totalSpecialists: number;
}

export interface TeamCatalogCardDto {
  id: number;
  name: string;
  description: string;
  coverImageUrl?: string | null;
  memberCount: number;
  topSkills: string[];
  skillCount: number;
  /** Set when a technology search matched a member skill rather than the team name. */
  matchedSkill?: string | null;
  memberPreviews: TeamCatalogMemberPreviewDto[];
}

export interface TeamCatalogMemberPreviewDto {
  fullName: string;
  profilePhotoUrl?: string | null;
}
