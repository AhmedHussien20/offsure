import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import { TeamMemberOptionDto, topTeamSkills } from 'app/core/models/teams/team.models';

type PickerScope = 'all' | 'unassigned' | 'other';

const QUICK_SKILL_LIMIT = 8;
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #0ea5e9, #0284c7)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
];

/**
 * Team roster builder: the chosen people and the skills they bring sit on top,
 * and everyone else is a grid of cards to click in or out. A member belongs to one
 * team, so picking someone from another team is flagged as a move.
 */
@Component({
  selector: 'app-admin-team-member-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-team-member-picker.component.html',
  styleUrl: './admin-team-member-picker.component.scss',
})
export class AdminTeamMemberPickerComponent {
  @Input() members: TeamMemberOptionDto[] = [];
  /** The team being edited; null while creating a new team. */
  @Input() teamId: number | null = null;
  @Input() selectedIds = new Set<number>();
  @Output() selectedIdsChange = new EventEmitter<Set<number>>();

  search = '';
  scope: PickerScope = 'all';
  skillFilter: string | null = null;

  private readonly brokenPhotos = new Set<number>();

  get selectedMembers(): TeamMemberOptionDto[] {
    return this.members.filter(m => this.selectedIds.has(m.id));
  }

  /** What the team card will show, from the people picked so far. */
  get coveredSkills(): string[] {
    return topTeamSkills(this.selectedMembers);
  }

  get movingCount(): number {
    return this.selectedMembers.filter(m => this.isInOtherTeam(m)).length;
  }

  /** Most common skills across everyone, offered as one-click filters. */
  get quickSkills(): string[] {
    return topTeamSkills(this.members, QUICK_SKILL_LIMIT);
  }

  get scopeCounts(): Record<PickerScope, number> {
    return {
      all: this.members.length,
      unassigned: this.members.filter(m => !m.teamId).length,
      other: this.members.filter(m => this.isInOtherTeam(m)).length,
    };
  }

  /** Keeps the server's order so cards don't jump when they are picked. */
  get visibleMembers(): TeamMemberOptionDto[] {
    const term = this.search.trim().toLowerCase();
    return this.members.filter(m => {
      if (this.scope === 'unassigned' && m.teamId) return false;
      if (this.scope === 'other' && !this.isInOtherTeam(m)) return false;
      if (this.skillFilter && !m.skills?.includes(this.skillFilter)) return false;
      if (!term) return true;
      return (
        m.fullName.toLowerCase().includes(term) ||
        !!m.title?.toLowerCase().includes(term) ||
        !!m.skills?.some(s => s.toLowerCase().includes(term))
      );
    });
  }

  get hasFilters(): boolean {
    return !!this.search.trim() || this.scope !== 'all' || !!this.skillFilter;
  }

  get visibleUnselectedCount(): number {
    return this.visibleMembers.filter(m => !this.isSelected(m)).length;
  }

  isSelected(member: TeamMemberOptionDto): boolean {
    return this.selectedIds.has(member.id);
  }

  isInOtherTeam(member: TeamMemberOptionDto): boolean {
    return !!member.teamId && member.teamId !== this.teamId;
  }

  toggle(member: TeamMemberOptionDto): void {
    const next = new Set(this.selectedIds);
    if (next.has(member.id)) {
      next.delete(member.id);
    } else {
      next.add(member.id);
    }
    this.emit(next);
  }

  remove(member: TeamMemberOptionDto): void {
    const next = new Set(this.selectedIds);
    next.delete(member.id);
    this.emit(next);
  }

  addAllVisible(): void {
    const next = new Set(this.selectedIds);
    for (const m of this.visibleMembers) next.add(m.id);
    this.emit(next);
  }

  clearSelection(): void {
    this.emit(new Set());
  }

  setScope(scope: PickerScope): void {
    this.scope = scope;
  }

  toggleSkillFilter(skill: string): void {
    this.skillFilter = this.skillFilter === skill ? null : skill;
  }

  resetFilters(): void {
    this.search = '';
    this.scope = 'all';
    this.skillFilter = null;
  }

  photoSrc(member: TeamMemberOptionDto): string | null {
    return this.brokenPhotos.has(member.id) ? null : resolveStorageAssetUrl(member.profilePhotoUrl);
  }

  onPhotoError(member: TeamMemberOptionDto): void {
    this.brokenPhotos.add(member.id);
  }

  initials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  }

  avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  }

  private emit(next: Set<number>): void {
    this.selectedIds = next;
    this.selectedIdsChange.emit(next);
  }
}
