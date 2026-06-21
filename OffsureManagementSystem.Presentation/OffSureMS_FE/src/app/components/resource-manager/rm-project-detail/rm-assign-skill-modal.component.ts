import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AssignProjectTeamMemberDto, ProjectDto } from 'app/core/models/projects/project.models';
import { SkillDto } from 'app/core/models/skills/skill.models';
import { TeamMemberDto, teamMemberDisplayName } from 'app/core/models/team-members/team-member.models';
import { resolveRmAssignmentDefaults, isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import { isNearScrollEnd } from 'app/core/utils/scroll-pagination.util';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import { ToastrService } from 'ngx-toastr';
import { concatMap, from, last, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

export interface RmMemberAssignDetail {
  member: TeamMemberDto;
  role: string;
  hourlyRate: number | null;
  allocatedHours: number | null;
}

const MEMBERS_PAGE_SIZE = 20;
const MEMBER_SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-rm-assign-skill-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rm-assign-skill-modal.component.html',
  styleUrl: '../../admin/admin-project-detail/admin-assign-skill-modal.component.scss',
})
export class RmAssignSkillModalComponent implements OnInit, OnDestroy {
  @Input() projectId = 0;
  @Input() project: ProjectDto | null = null;
  @Input() skill: SkillDto | null = null;
  @Input() assignBySkill = true;
  @Input() excludedMemberIds: number[] = [];

  step: 1 | 2 = 1;
  memberSearch = '';
  selectedMemberIds = new Set<number>();
  memberDetails: RmMemberAssignDetail[] = [];
  saving = false;

  members: TeamMemberDto[] = [];
  membersPageIndex = 1;
  membersHasMore = true;
  membersLoading = false;

  private readonly destroy$ = new Subject<void>();
  private readonly memberSearch$ = new Subject<string>();
  private readonly membersById = new Map<number, TeamMemberDto>();

  constructor(
    public activeModal: NgbActiveModal,
    private portal: ResourceManagerPortalService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.memberSearch$.pipe(debounceTime(MEMBER_SEARCH_DEBOUNCE_MS), takeUntil(this.destroy$)).subscribe(() => {
      this.loadMembers(false);
    });
    this.loadMembers(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedCount(): number {
    return this.selectedMemberIds.size;
  }

  get isHourlyBudget(): boolean {
    return isHourlyBudgetProject(this.project);
  }

  get modalTitle(): string {
    return this.assignBySkill && this.skill ? `Assign to ${this.skill.name}` : 'Assign team members';
  }

  get step1Hint(): string {
    if (this.assignBySkill && this.skill) {
      return 'Select team members from your roster who have this skill';
    }
    return 'Select team members from your full roster';
  }

  get submitLabel(): string {
    return this.assignBySkill && this.skill ? `Assign to ${this.skill.name}` : 'Assign to project';
  }

  displayName(m: TeamMemberDto): string {
    return teamMemberDisplayName(m);
  }

  memberInitials(m: TeamMemberDto): string {
    const name = this.displayName(m);
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }

  skillTags(m: TeamMemberDto): string[] {
    return (m.skillAssignments ?? []).map(s => s.skillName).filter(Boolean);
  }

  isSelected(id: number): boolean {
    return this.selectedMemberIds.has(id);
  }

  onMemberSearchInput(value: string): void {
    this.memberSearch = value;
    this.memberSearch$.next(value);
  }

  onMemberListScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!isNearScrollEnd(el) || this.membersLoading || !this.membersHasMore) {
      return;
    }
    this.loadMembers(true);
  }

  toggleMember(m: TeamMemberDto): void {
    this.membersById.set(m.id, m);
    if (this.selectedMemberIds.has(m.id)) {
      this.selectedMemberIds.delete(m.id);
    } else {
      this.selectedMemberIds.add(m.id);
    }
  }

  goToStep2(): void {
    if (this.selectedMemberIds.size === 0) {
      this.toastr.warning('Select at least one team member.');
      return;
    }
    this.memberDetails = [...this.selectedMemberIds]
      .map(id => this.membersById.get(id))
      .filter((m): m is TeamMemberDto => !!m)
      .map(member => {
        const defaults = this.isHourlyBudget
          ? resolveRmAssignmentDefaults(this.project, member)
          : { hourlyRate: null, allocatedHours: null };
        return {
          member,
          role: member.title?.trim() || (this.assignBySkill && this.skill ? `${this.skill.name} specialist` : 'Team member'),
          hourlyRate: defaults.hourlyRate,
          allocatedHours: defaults.allocatedHours,
        };
      });
    this.step = 2;
  }

  backToStep1(): void {
    this.step = 1;
  }

  canSubmit(): boolean {
    return this.memberDetails.every(d => {
      if (!d.role.trim().length) {
        return false;
      }
      if (!this.isHourlyBudget) {
        return true;
      }
      return (Number(d.allocatedHours) || 0) > 0;
    });
  }

  memberMissingSalary(member: TeamMemberDto): boolean {
    return this.isHourlyBudget && (member.hourlySalary ?? 0) <= 0;
  }

  submit(): void {
    if (!this.projectId || !this.canSubmit()) {
      this.toastr.warning(
        this.isHourlyBudget
          ? 'Set role and allocated hours for each member.'
          : 'Set a role for each member.'
      );
      return;
    }

    const dtos: AssignProjectTeamMemberDto[] = this.memberDetails.map(d => {
      const dto: AssignProjectTeamMemberDto = {
        teamMemberId: d.member.id,
        role: d.role.trim(),
      };
      if (this.assignBySkill && this.skill) {
        dto.skillId = this.skill.id;
      }
      if (this.isHourlyBudget) {
        dto.hourlyRate = Number(d.hourlyRate) || 0;
        dto.allocatedHours = Number(d.allocatedHours);
      }
      return dto;
    });

    this.saving = true;
    from(dtos)
      .pipe(
        concatMap(dto => this.portal.assignTeamMember(this.projectId, dto)),
        last()
      )
      .subscribe({
        next: res => {
          this.toastr.success(
            dtos.length === 1 ? 'Team member assigned.' : `${dtos.length} team members assigned.`
          );
          this.activeModal.close(res.data);
        },
        error: err => {
          this.saving = false;
          this.toastr.error(err?.error?.message || 'Failed to assign team members.');
        },
      });
  }

  private loadMembers(append: boolean): void {
    if (this.membersLoading) return;
    if (append && !this.membersHasMore) return;

    const pageIndex = append ? this.membersPageIndex + 1 : 1;
    this.membersLoading = true;

    this.portal
      .getTeamMembers({
        pageIndex,
        pageSize: MEMBERS_PAGE_SIZE,
        skillId: this.assignBySkill && this.skill ? this.skill.id : undefined,
        isAvailable: true,
        searchKey: this.memberSearch.trim() || undefined,
      })
      .subscribe({
        next: res => {
          const paged = res.data;
          const batch = (paged?.data ?? []).filter(m => !this.excludedMemberIds.includes(m.id));
          batch.forEach(m => this.membersById.set(m.id, m));

          if (append) {
            const existing = new Set(this.members.map(m => m.id));
            this.members = [...this.members, ...batch.filter(m => !existing.has(m.id))];
          } else {
            this.members = batch;
          }

          this.membersPageIndex = pageIndex;
          const total = paged?.totalCount ?? 0;
          this.membersHasMore = pageIndex * MEMBERS_PAGE_SIZE < total;
          this.membersLoading = false;
        },
        error: () => {
          this.membersLoading = false;
        },
      });
  }
}
