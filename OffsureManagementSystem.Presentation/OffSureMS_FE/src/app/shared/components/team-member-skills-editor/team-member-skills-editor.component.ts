import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SkillDto } from 'app/core/models/skills/skill.models';
import {
  TeamMemberDto,
  TeamMemberSkillDto,
  UpsertTeamMemberSkillDto,
} from 'app/core/models/team-members/team-member.models';
import { SkillsService } from 'app/core/services/skills.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { TeamPortalService } from 'app/core/services/team-portal.service';
import { isNearScrollEnd } from 'app/core/utils/scroll-pagination.util';
import { PROFICIENCY_LABELS } from 'app/components/team/team.constants';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

const SKILLS_PAGE_SIZE = 10;
const SKILLS_SEARCH_DEBOUNCE_MS = 300;
const LIVE_SAVE_DEBOUNCE_MS = 400;

export interface MemberSkillDraft {
  skillId: number;
  skillName: string;
  skillCategoryName: string;
  proficiencyLevel: number;
  yearsOfExperience: number;
}

@Component({
  selector: 'app-team-member-skills-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-member-skills-editor.component.html',
  styleUrl: './team-member-skills-editor.component.scss',
})
export class TeamMemberSkillsEditorComponent implements OnInit, OnChanges, OnDestroy {
  /** draft = local only (create member); live = save via API */
  @Input() mode: 'draft' | 'live' = 'draft';
  @Input() memberId?: number;
  /** live mode: team portal (profile) vs admin team-members API */
  @Input() usePortal = true;
  @Input() readonly = false;
  @Input() initialSkills: TeamMemberSkillDto[] = [];

  @Output() assignmentsChange = new EventEmitter<UpsertTeamMemberSkillDto[]>();
  @Output() profileChange = new EventEmitter<TeamMemberDto>();

  skillSearchQuery = '';
  skillsList: SkillDto[] = [];
  skillsPageIndex = 1;
  skillsHasMore = true;
  skillsLoading = false;
  savingLive = false;

  readonly proficiencyLabels = PROFICIENCY_LABELS;
  drafts = new Map<number, MemberSkillDraft>();
  private skillCatalogById = new Map<number, SkillDto>();
  private readonly destroy$ = new Subject<void>();
  private readonly skillSearch$ = new Subject<string>();
  private liveSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private skillsService: SkillsService,
    private teamPortal: TeamPortalService,
    private teamMembersService: TeamMembersService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.skillSearch$.pipe(debounceTime(SKILLS_SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$)).subscribe(() => {
      this.loadSkillsPage(false);
    });
    this.loadSkillsPage(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialSkills']) {
      this.syncFromInitial();
    }
  }

  ngOnDestroy(): void {
    if (this.liveSaveTimer) {
      clearTimeout(this.liveSaveTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedDrafts(): MemberSkillDraft[] {
    return [...this.drafts.values()].sort((a, b) => a.skillName.localeCompare(b.skillName));
  }

  get selectedCount(): number {
    return this.drafts.size;
  }

  isSkillSelected(skillId: number): boolean {
    return this.drafts.has(skillId);
  }

  onSkillSearchInput(value: string): void {
    this.skillSearchQuery = value;
    this.skillSearch$.next(value);
  }

  onSkillPickerScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!isNearScrollEnd(el) || this.skillsLoading || !this.skillsHasMore) {
      return;
    }
    this.loadSkillsPage(true);
  }

  toggleSkill(skill: SkillDto): void {
    if (this.readonly) return;

    this.skillCatalogById.set(skill.id, skill);
    if (this.drafts.has(skill.id)) {
      if (this.mode === 'live' && this.memberId) {
        this.removeLive(skill.id);
      } else {
        this.drafts.delete(skill.id);
        this.emitDraft();
      }
    } else {
      const draft: MemberSkillDraft = {
        skillId: skill.id,
        skillName: skill.name,
        skillCategoryName: skill.skillCategoryName,
        proficiencyLevel: 3,
        yearsOfExperience: 0,
      };
      this.drafts.set(skill.id, draft);
      if (this.mode === 'live' && this.memberId) {
        this.persistLive(draft);
      } else {
        this.emitDraft();
      }
    }
  }

  onDraftFieldChange(draft: MemberSkillDraft): void {
    this.drafts.set(draft.skillId, { ...draft });
    if (this.mode === 'live' && this.memberId) {
      this.scheduleLiveSave(draft);
    } else {
      this.emitDraft();
    }
  }

  removeDraft(skillId: number): void {
    if (this.readonly) return;
    if (this.mode === 'live' && this.memberId) {
      this.removeLive(skillId);
    } else {
      this.drafts.delete(skillId);
      this.emitDraft();
    }
  }

  proficiencyLabel(level: number): string {
    return this.proficiencyLabels[level] ?? `Level ${level}`;
  }

  private syncFromInitial(): void {
    this.drafts.clear();
    for (const s of this.initialSkills ?? []) {
      this.drafts.set(s.skillId, {
        skillId: s.skillId,
        skillName: s.skillName,
        skillCategoryName: s.skillCategoryName,
        proficiencyLevel: s.proficiencyLevel,
        yearsOfExperience: s.yearsOfExperience,
      });
      this.skillCatalogById.set(s.skillId, {
        id: s.skillId,
        name: s.skillName,
        skillCategoryName: s.skillCategoryName,
      } as SkillDto);
    }
    this.emitDraft();
  }

  private emitDraft(): void {
    const payload: UpsertTeamMemberSkillDto[] = [...this.drafts.values()].map(d => ({
      skillId: d.skillId,
      proficiencyLevel: Number(d.proficiencyLevel) || 1,
      yearsOfExperience: Number(d.yearsOfExperience) || 0,
    }));
    this.assignmentsChange.emit(payload);
  }

  private scheduleLiveSave(draft: MemberSkillDraft): void {
    if (this.liveSaveTimer) {
      clearTimeout(this.liveSaveTimer);
    }
    this.liveSaveTimer = setTimeout(() => this.persistLive(draft), LIVE_SAVE_DEBOUNCE_MS);
  }

  private persistLive(draft: MemberSkillDraft): void {
    if (!this.memberId) return;

    const dto: UpsertTeamMemberSkillDto = {
      skillId: draft.skillId,
      proficiencyLevel: Math.min(5, Math.max(1, Number(draft.proficiencyLevel) || 1)),
      yearsOfExperience: Math.max(0, Number(draft.yearsOfExperience) || 0),
    };

    this.savingLive = true;
    const req = this.usePortal
      ? this.teamPortal.assignSkill(dto)
      : this.teamMembersService.assignSkill(this.memberId, dto);

    req.subscribe({
      next: res => {
        this.applyProfileSkills(res.data);
        this.savingLive = false;
      },
      error: err => {
        this.savingLive = false;
        this.toastr.error(err?.error?.message || 'Failed to save skill.');
      },
    });
  }

  private removeLive(skillId: number): void {
    if (!this.memberId) return;

    this.savingLive = true;
    const req = this.usePortal
      ? this.teamPortal.removeSkill(skillId)
      : this.teamMembersService.removeSkill(this.memberId, skillId);

    req.subscribe({
      next: res => {
        this.applyProfileSkills(res.data);
        this.savingLive = false;
        this.toastr.success('Skill removed.');
      },
      error: err => {
        this.savingLive = false;
        this.toastr.error(err?.error?.message || 'Failed to remove skill.');
      },
    });
  }

  private applyProfileSkills(profile: TeamMemberDto | null | undefined): void {
    if (!profile) return;
    this.initialSkills = profile.skillAssignments ?? [];
    this.syncFromInitial();
    this.profileChange.emit(profile);
  }

  private loadSkillsPage(append: boolean): void {
    if (this.skillsLoading) return;
    if (append && !this.skillsHasMore) return;

    const pageIndex = append ? this.skillsPageIndex + 1 : 1;
    this.skillsLoading = true;

    this.skillsService
      .getAll({
        pageIndex,
        pageSize: SKILLS_PAGE_SIZE,
        isActive: true,
        searchKey: this.skillSearchQuery.trim() || undefined,
      })
      .subscribe({
        next: res => {
          const paged = res.data;
          const batch = (paged?.data ?? []).filter(s => s.isActive);
          batch.forEach(s => this.skillCatalogById.set(s.id, s));

          if (append) {
            const existing = new Set(this.skillsList.map(s => s.id));
            this.skillsList = [...this.skillsList, ...batch.filter(s => !existing.has(s.id))];
          } else {
            this.skillsList = batch;
          }

          this.skillsPageIndex = pageIndex;
          const total = paged?.totalCount ?? 0;
          this.skillsHasMore = this.skillsList.length < total;
          this.skillsLoading = false;
        },
        error: () => {
          this.skillsLoading = false;
        },
      });
  }
}
