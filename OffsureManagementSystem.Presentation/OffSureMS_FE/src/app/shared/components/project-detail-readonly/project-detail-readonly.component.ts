import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { ProjectAssignmentDto, ProjectDto } from 'app/core/models/projects/project.models';
import { SkillDto } from 'app/core/models/skills/skill.models';
import { SkillsService } from 'app/core/services/skills.service';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import { buildProjectSkillSlots, displayRole, ProjectSkillSlotView } from 'app/core/utils/project-skill.util';
import { ProjectMilestonesReadonlyComponent } from '../project-milestones-readonly/project-milestones-readonly.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type ProjectDetailAudience = 'client' | 'team';

@Component({
  selector: 'app-project-detail-readonly',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbNavModule, ProjectMilestonesReadonlyComponent],
  templateUrl: './project-detail-readonly.component.html',
  styleUrl: './project-detail-readonly.component.scss',
})
export class ProjectDetailReadonlyComponent implements OnChanges {
  @Input({ required: true }) project!: ProjectDto;
  @Input() audience: ProjectDetailAudience = 'client';
  @Input() myRole?: string;
  @Input() highlightMemberId?: number;
  @Input() statusBadgeClassFn: (status: unknown) => string = () => 'bg-light';
  @Input() statusLabelFn: (status: unknown) => string = s => String(s ?? '');
  @Input() backLink?: string;
  @Input() backLabel = 'Back';

  skillSlots: ProjectSkillSlotView[] = [];
  selectedSkillsForDisplay: SkillDto[] = [];
  activeTab: 'overview' | 'milestones' | 'team' = 'overview';

  private skillCatalogById = new Map<number, SkillDto>();

  constructor(private skillsService: SkillsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.project) {
      this.refreshSkillCatalog();
      this.applyInitialTab();
    }
  }

  get isClient(): boolean {
    return this.audience === 'client';
  }

  get isTeam(): boolean {
    return this.audience === 'team';
  }

  get usesMilestones(): boolean {
    return this.isTeam && !!this.project.usesMilestones && !isHourlyBudgetProject(this.project);
  }

  get revenue(): number {
    return this.project.budget ?? 0;
  }

  get milestoneCountLabel(): string | null {
    if (!this.usesMilestones) {
      return null;
    }
    const defined = this.project.milestones?.length ?? 0;
    const max = this.project.milestoneCount ?? 0;
    return max > 0 ? `${defined}/${max}` : null;
  }

  get headerSubtitle(): string {
    if (this.isClient) {
      return this.project.serviceName || '';
    }
    return `${this.project.clientName} · ${this.project.serviceName}`;
  }

  get progressPercent(): number {
    return Math.min(100, Math.max(0, this.project.progress ?? 0));
  }

  get hasRequiredSkills(): boolean {
    return (this.project.requiredSkillIds?.length ?? 0) > 0;
  }

  memberInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }

  roleLabel(role: string): string {
    return displayRole(role);
  }

  showAssignmentCost(): boolean {
    return this.isTeam && isHourlyBudgetProject(this.project);
  }

  isSelf(assignment: ProjectAssignmentDto): boolean {
    return this.highlightMemberId != null && assignment.teamMemberId === this.highlightMemberId;
  }

  private applyInitialTab(): void {
    this.activeTab = this.usesMilestones ? 'milestones' : 'overview';
  }

  private refreshSkillCatalog(): void {
    const ids = this.project.requiredSkillIds ?? [];
    if (!ids.length) {
      this.skillCatalogById.clear();
      this.rebuildView();
      return;
    }

    forkJoin(
      ids.map(id =>
        this.skillsService.getById(id).pipe(catchError(() => of({ data: null as SkillDto | null })))
      )
    ).subscribe(results => {
      this.skillCatalogById.clear();
      results.forEach(res => {
        const skill = res.data;
        if (skill && skill.isActive !== false) {
          this.skillCatalogById.set(skill.id, skill);
        }
      });
      this.rebuildView();
    });
  }

  private rebuildView(): void {
    this.selectedSkillsForDisplay = (this.project.requiredSkillIds ?? [])
      .map(id => this.skillCatalogById.get(id))
      .filter((s): s is SkillDto => !!s);
    this.skillSlots = buildProjectSkillSlots(this.project, this.skillCatalogById);
  }
}
