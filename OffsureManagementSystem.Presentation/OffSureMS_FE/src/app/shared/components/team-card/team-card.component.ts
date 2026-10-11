import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import { TeamCatalogMemberPreviewDto } from 'app/core/models/teams/team.models';
import { TeamCoverComponent } from 'app/shared/components/team-cover/team-cover.component';

const CARD_SKILL_LIMIT = 4;

/**
 * Offshore team card as clients see it in Offshore TechX (cover, name, key skills, faces).
 * Also used by the admin team screens as a live preview.
 */
@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [CommonModule, TeamCoverComponent],
  templateUrl: './team-card.component.html',
  styleUrl: './team-card.component.scss',
})
export class TeamCardComponent {
  @Input({ required: true }) name = '';
  @Input() description?: string | null;
  @Input() coverImageUrl?: string | null;
  @Input() memberCount = 0;
  /** Most common skills first. */
  @Input() skills: string[] = [];
  /** Total distinct skills, for the "+N" chip; defaults to skills.length. */
  @Input() skillCount?: number;
  /** Skill that matched a technology search; shown first and highlighted. */
  @Input() matchedSkill?: string | null;
  @Input() faces: TeamCatalogMemberPreviewDto[] = [];
  @Input() cue = 'Open team';

  private readonly brokenPhotos = new Set<string>();

  get shownSkills(): string[] {
    const shown = this.skills.slice(0, CARD_SKILL_LIMIT);
    if (this.matchedSkill && !shown.includes(this.matchedSkill)) {
      return [this.matchedSkill, ...shown.slice(0, CARD_SKILL_LIMIT - 1)];
    }
    return shown;
  }

  get moreSkills(): number {
    return Math.max(0, (this.skillCount ?? this.skills.length) - this.shownSkills.length);
  }

  get countLabel(): string {
    return this.memberCount === 1 ? '1 specialist' : `${this.memberCount} specialists`;
  }

  photoSrc(face: TeamCatalogMemberPreviewDto): string | null {
    const src = resolveStorageAssetUrl(face.profilePhotoUrl);
    return src && !this.brokenPhotos.has(src) ? src : null;
  }

  /** Missing photo files fall back to initials instead of a broken image. */
  onPhotoError(face: TeamCatalogMemberPreviewDto): void {
    const src = resolveStorageAssetUrl(face.profilePhotoUrl);
    if (src) this.brokenPhotos.add(src);
  }

  initials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  }
}
