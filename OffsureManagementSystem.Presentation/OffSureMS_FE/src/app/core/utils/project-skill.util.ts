import { ProjectAssignmentDto } from '../models/projects/project.models';
import { SkillDto } from '../models/skills/skill.models';

export interface ProjectSkillSlotView {
  skill: SkillDto;
  assignments: ProjectAssignmentDto[];
  pending: boolean;
}

const SKILLS_MARKER = /^@@SKILLS:\[([^\]]*)\]@@\r?\n?/;
const ROLE_SKILL_PREFIX = /^\[skill:(\d+)\]\s*/i;

export function parseRequiredSkillIds(description: string | null | undefined): number[] {
  if (!description) return [];
  const match = description.match(SKILLS_MARKER);
  if (!match?.[1]?.trim()) return [];
  return match[1]
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isInteger(n) && n > 0);
}

export function stripSkillsMarker(description: string | null | undefined): string {
  if (!description) return '';
  return description.replace(SKILLS_MARKER, '').trim();
}

export function embedRequiredSkillIds(cleanDescription: string, skillIds: number[]): string {
  const body = (cleanDescription ?? '').trim();
  if (!skillIds.length) {
    return body;
  }
  const ids = [...new Set(skillIds)].sort((a, b) => a - b).join(',');
  return `@@SKILLS:[${ids}]@@\n${body}`;
}

export function skillIdFromRole(role: string | null | undefined): number | null {
  if (!role) return null;
  const m = role.match(ROLE_SKILL_PREFIX);
  return m ? Number(m[1]) : null;
}

export function formatSkillRole(skillId: number, label: string): string {
  return `[skill:${skillId}] ${label.trim()}`;
}

export function displayRole(role: string): string {
  return role.replace(ROLE_SKILL_PREFIX, '').trim();
}

export function assignmentForSkill(
  assignments: ProjectAssignmentDto[] | undefined,
  skillId: number
): ProjectAssignmentDto | undefined {
  return assignmentsForSkill(assignments, skillId)[0];
}

export function assignmentsForSkill(
  assignments: ProjectAssignmentDto[] | undefined,
  skillId: number
): ProjectAssignmentDto[] {
  return (assignments ?? []).filter(a => skillIdFromRole(a.role) === skillId);
}

/** Case-insensitive match against any of the given strings. */
export function matchesSearch(query: string, ...parts: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts.some(p => (p ?? '').toLowerCase().includes(q));
}

export function assignmentLineCost(assignment: ProjectAssignmentDto): number {
  const rate = assignment.hourlyRate ?? 0;
  const hours = assignment.allocatedHours ?? 0;
  if (rate <= 0 || hours <= 0) return 0;
  return rate * hours;
}

export interface ProjectFinancials {
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number | null;
  hasCompleteCostData: boolean;
}

export function buildProjectSkillSlots(
  project: { requiredSkillIds?: number[]; teamMembers?: ProjectAssignmentDto[] },
  skillCatalogById: Map<number, SkillDto>
): ProjectSkillSlotView[] {
  const ids = project.requiredSkillIds ?? [];
  return ids
    .map(id => skillCatalogById.get(id))
    .filter((s): s is SkillDto => !!s)
    .map(skill => {
      const assignments = assignmentsForSkill(project.teamMembers, skill.id);
      return { skill, assignments, pending: assignments.length === 0 };
    });
}

export function computeProjectFinancials(
  budget: number | null | undefined,
  assignments: ProjectAssignmentDto[] | undefined
): ProjectFinancials {
  const revenue = budget ?? 0;
  const lines = assignments ?? [];
  const cost = lines.reduce((sum, a) => sum + assignmentLineCost(a), 0);
  const hasCompleteCostData =
    lines.length > 0 && lines.every(a => (a.hourlyRate ?? 0) > 0 && (a.allocatedHours ?? 0) > 0);
  const profit = revenue - cost;
  const marginPercent = revenue > 0 ? Math.round((profit / revenue) * 100) : null;
  return { revenue, cost, profit, marginPercent, hasCompleteCostData };
}
