import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { BreadcrumbService } from 'app/core/services/breadcrumb.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { TeamContextService } from 'app/core/services/team-context.service';
import { ProjectDetailReadonlyComponent } from 'app/shared/components/project-detail-readonly/project-detail-readonly.component';
import { projectStatusKey } from 'app/core/utils/enum-status.util';
import { displayRole } from 'app/core/utils/project-skill.util';
import { isHourlyBudgetProject } from 'app/core/utils/project-budget-form.util';
import { SharedModule } from 'app/shared/shared.module';
import { PROJECT_STATUS_BADGES } from '../../client/client.constants';

@Component({
  selector: 'app-team-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ProjectDetailReadonlyComponent],
  templateUrl: './team-project-detail.component.html',
})
export class TeamProjectDetailComponent implements OnInit {
  project: ProjectDto | null = null;
  myRole = '—';
  teamMemberId: number | undefined;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: ProjectsService,
    private teamContext: TeamContextService,
    private breadcrumbService: BreadcrumbService
  ) {}

  get isHourlyProject(): boolean {
    return isHourlyBudgetProject(this.project);
  }

  openLogTimePage(): void {
    if (!this.project) return;
    void this.router.navigate(['/team', 'projects', this.project.id, 'timesheet']);
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.loading = false;
      return;
    }

    this.teamContext.loadProfile().subscribe(profile => {
      this.teamMemberId = profile?.id;
      this.projectsService.getTeamMyById(id).subscribe({
        next: res => {
          this.project = res.data ?? null;
          if (this.project?.name) {
            this.breadcrumbService.setDynamicLabel(this.project.name);
          }
          if (this.project && this.teamMemberId) {
            const assignment = this.project.teamMembers?.find(m => m.teamMemberId === this.teamMemberId);
            this.myRole = assignment?.role ? displayRole(assignment.role) : '—';
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
    });
  }

  readonly statusBadgeClassFn = (status: unknown): string =>
    PROJECT_STATUS_BADGES[projectStatusKey(status)]?.class ?? 'bg-light';

  readonly statusLabelFn = (status: unknown): string =>
    PROJECT_STATUS_BADGES[projectStatusKey(status)]?.text ?? String(status ?? '');
}

