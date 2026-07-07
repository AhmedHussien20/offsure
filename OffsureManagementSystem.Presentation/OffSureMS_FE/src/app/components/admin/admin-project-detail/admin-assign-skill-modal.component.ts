import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AssignProjectTeamMemberDto, ProjectDto } from 'app/core/models/projects/project.models';
import { SkillDto } from 'app/core/models/skills/skill.models';
import { TeamMemberDto, teamMemberDisplayName } from 'app/core/models/team-members/team-member.models';
import { resolveAssignmentDefaults, isHourlyBudgetProject, memberHasProjectRmAssigned, memberHasResourceManager, memberRmMissingFromProject, resolveMemberProjectRmCostRate } from 'app/core/utils/project-budget-form.util';
import { isNearScrollEnd } from 'app/core/utils/scroll-pagination.util';
import { ProjectsService } from 'app/core/services/projects.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { ToastrService } from 'ngx-toastr';
import { concatMap, from, last, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

export interface MemberAssignDetail {
  member: TeamMemberDto;
  role: string;
  hourlyRate: number | null;
  allocatedHours: number | null;
  costRate: number | null;
}

const MEMBERS_PAGE_SIZE = 20;
const MEMBER_SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-admin-assign-skill-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-assign-skill-modal.component.html',
  styleUrl: './admin-assign-skill-modal.component.scss',
})
export class AdminAssignSkillModalComponent implements OnInit, OnDestroy {
  @Input() projectId = 0;
  @Input() project: ProjectDto | null = null;
  @Input() skill: SkillDto | null = null;
  @Input() assignBySkill = true;
  @Input() excludedMemberIds: number[] = [];

  step: 1 | 2 = 1;
  memberSearch = '';
  selectedMemberIds = new Set<number>();
  memberDetails: MemberAssignDetail[] = [];
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
    private projectsService: ProjectsService,
    private teamMembersService: TeamMembersService,
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
      return 'Select team members from the organization who have this skill';
    }
    return 'Select team members from the full organization roster';
  }

  get submitLabel(): string {
    return this.assignBySkill && this.skill ? `Assign to ${this.skill.name}` : 'Assign to project';
  }

  get isHourlyTimesheetProject(): boolean {
    return isHourlyBudgetProject(this.project);
  }

  get totalTrackCost(): number {
    return this.memberDetails.reduce((sum, d) => sum + this.detailLineCost(d), 0);
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
    if (this.memberRmMissingFromProject(m)) {
      const rmName = m.resourceManagerName?.trim() || 'their resource manager';
      this.toastr.warning(`Assign ${rmName} to this project before assigning ${this.displayName(m)}.`);
      return;
    }
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
    this.buildMemberDetailsStep2();
    this.step = 2;
  }

  private buildMemberDetailsStep2(): void {
    this.memberDetails = [...this.selectedMemberIds]
      .map(id => this.membersById.get(id))
      .filter((m): m is TeamMemberDto => !!m)
      .map(member => {
        const defaults = this.isHourlyBudget
          ? resolveAssignmentDefaults(this.project, member)
          : { hourlyRate: null, allocatedHours: null };
        return {
          member,
          role: member.title?.trim() || (this.assignBySkill && this.skill ? `${this.skill.name} specialist` : 'Team member'),
          hourlyRate: this.isHourlyTimesheetProject ? null : defaults.hourlyRate,
          allocatedHours: this.isHourlyTimesheetProject ? null : defaults.allocatedHours,
          costRate: this.isHourlyTimesheetProject ? resolveMemberProjectRmCostRate(this.project, member) : null,
        };
      });
  }

  backToStep1(): void {
    this.step = 1;
  }

  memberRmMissingFromProject(member: TeamMemberDto): boolean {
    return memberRmMissingFromProject(this.project, member);
  }

  memberHasRm(member: TeamMemberDto): boolean {
    return memberHasResourceManager(member);
  }

  memberRmCostRate(member: TeamMemberDto): number | null {
    return resolveMemberProjectRmCostRate(this.project, member);
  }

  memberUsesRmCostRate(member: TeamMemberDto): boolean {
    return this.memberRmCostRate(member) != null;
  }

  memberRmOnProjectWithoutRate(member: TeamMemberDto): boolean {
    return memberHasProjectRmAssigned(this.project, member) && !this.memberUsesRmCostRate(member);
  }

  effectiveCostRate(d: MemberAssignDetail): number {
    return this.memberRmCostRate(d.member) ?? (Number(d.costRate) || 0);
  }

  detailLineCost(d: MemberAssignDetail): number {
    const rate = Number(d.hourlyRate) || 0;
    const hours = Number(d.allocatedHours) || 0;
    return rate * hours;
  }

  canSubmit(): boolean {
    return this.memberDetails.every(d => {
      if (!d.role.trim().length) {
        return false;
      }
      if (this.isHourlyTimesheetProject) {
        if (this.memberRmMissingFromProject(d.member)) {
          return false;
        }
        if (this.memberRmOnProjectWithoutRate(d.member)) {
          return false;
        }
        if (this.memberUsesRmCostRate(d.member)) {
          return true;
        }
        if (this.memberHasRm(d.member)) {
          return false;
        }
        return (Number(d.costRate) || 0) > 0;
      }
      if (this.memberRmMissingFromProject(d.member)) {
        return false;
      }
      if (!this.isHourlyBudget) {
        return true;
      }
      return (Number(d.hourlyRate) || 0) > 0 && (Number(d.allocatedHours) || 0) > 0;
    });
  }

  submit(): void {
    if (!this.projectId || !this.canSubmit()) {
      this.toastr.warning(
        this.isHourlyTimesheetProject
          ? this.memberDetails.some(d => this.memberRmMissingFromProject(d.member))
            ? 'Assign each member\'s resource manager to this project before assigning them.'
            : this.memberDetails.some(d => this.memberRmOnProjectWithoutRate(d.member))
              ? "Set the resource manager's project cost rate before assigning their team members."
              : 'Set a role and cost rate for each member without a resource manager.'
          : this.memberDetails.some(d => this.memberRmMissingFromProject(d.member))
            ? 'Assign each member\'s resource manager to this project before assigning them.'
            : this.isHourlyBudget
            ? 'Set role, hourly rate, and allocated hours for each member.'
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
      if (this.isHourlyTimesheetProject) {
        if (!this.memberHasRm(d.member)) {
          dto.hourlyRate = Number(d.costRate);
        }
      }
      if (!this.isHourlyTimesheetProject && this.isHourlyBudget) {
        dto.hourlyRate = Number(d.hourlyRate);
        dto.allocatedHours = Number(d.allocatedHours);
      }
      return dto;
    });

    this.saving = true;
    from(dtos)
      .pipe(
        concatMap(dto => this.projectsService.assignTeamMember(this.projectId, dto)),
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
          },
      });
  }

  private loadMembers(append: boolean): void {
    if (this.membersLoading) return;
    if (append && !this.membersHasMore) return;

    const pageIndex = append ? this.membersPageIndex + 1 : 1;
    this.membersLoading = true;

    this.teamMembersService
      .getAll({
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
