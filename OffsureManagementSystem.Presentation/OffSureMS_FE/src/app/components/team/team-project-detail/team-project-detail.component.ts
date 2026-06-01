import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectDto } from 'app/core/models/projects/project.models';
import { ProjectsService } from 'app/core/services/projects.service';
import { TeamContextService } from 'app/core/services/team-context.service';
import { projectStatusKey } from 'app/core/utils/enum-status.util';
import { SharedModule } from 'app/shared/shared.module';
import { PROJECT_STATUS_BADGES } from '../../client/client.constants';

@Component({
  selector: 'app-team-project-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './team-project-detail.component.html',
})
export class TeamProjectDetailComponent implements OnInit {
  project: ProjectDto | null = null;
  myRole = '—';
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private teamContext: TeamContextService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.loading = false;
      return;
    }

    this.teamContext.loadProfile().subscribe(profile => {
      const teamMemberId = profile?.id;
      this.projectsService.getTeamMyById(id).subscribe({
        next: res => {
          this.project = res.data ?? null;
          if (this.project && teamMemberId) {
            const assignment = this.project.teamMembers?.find(m => m.teamMemberId === teamMemberId);
            this.myRole = assignment?.role ?? '—';
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
    });
  }

  statusBadgeClass(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.text ?? String(status ?? '');
  }
}
