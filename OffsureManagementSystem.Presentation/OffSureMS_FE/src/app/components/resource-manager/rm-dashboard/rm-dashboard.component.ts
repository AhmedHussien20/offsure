import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SpkApexChartsComponent } from 'app/@spk/reusable-charts/spk-apex-charts/spk-apex-charts.component';
import { SpkEcommerceComponent } from 'app/@spk/reusable-ecommerce/spk-ecommerce/spk-ecommerce.component';
import { ChartCountItem } from 'app/core/models/dashboard/dashboard-statistics.models';
import { ProjectDto, ProjectStatus } from 'app/core/models/projects/project.models';
import { TeamMemberDto, teamMemberDisplayName } from 'app/core/models/team-members/team-member.models';
import { ResourceManagerPortalService } from 'app/core/services/resource-manager-portal.service';
import { buildDonutChartOptions } from 'app/core/utils/dashboard-chart.util';
import { projectStatusKey } from 'app/core/utils/enum-status.util';
import { SharedModule } from 'app/shared/shared.module';
import { PROJECT_STATUS_BADGES } from '../../admin/admin.constants';

@Component({
  selector: 'app-rm-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, SpkEcommerceComponent, SpkApexChartsComponent],
  templateUrl: './rm-dashboard.component.html',
  styleUrl: './rm-dashboard.component.scss',
})
export class RmDashboardComponent implements OnInit {
  loading = true;

  statCards: { label: string; value: string; icon: string; description: string; subValue: string; link: string }[] =
    [];

  teamMembers: TeamMemberDto[] = [];
  activeProjects: ProjectDto[] = [];

  projectsStatusChart: Record<string, unknown> | null = null;
  teamAvailabilityChart: Record<string, unknown> | null = null;

  constructor(private portal: ResourceManagerPortalService) {}

  ngOnInit(): void {
    forkJoin({
      team: this.portal.getTeamMembers({ pageIndex: 1, pageSize: 100 }),
      projects: this.portal.getProjects({ pageIndex: 1, pageSize: 100 }),
      inProgress: this.portal.getProjects({
        pageIndex: 1,
        pageSize: 5,
        status: ProjectStatus.InProgress,
      }),
    }).subscribe({
      next: ({ team, projects, inProgress }) => {
        const teamPaged = team.data;
        const projectsPaged = projects.data;
        const inProgressPaged = inProgress.data;

        const allTeam = teamPaged?.data ?? [];
        const allProjects = projectsPaged?.data ?? [];

        const totalTeam = teamPaged?.totalCount ?? allTeam.length;
        const availableCount = allTeam.filter(m => m.isAvailable).length;
        const busyCount = allTeam.length - availableCount;
        const totalProjects = projectsPaged?.totalCount ?? allProjects.length;
        const inProgressCount = inProgressPaged?.totalCount ?? 0;

        this.statCards = [
          {
            label: 'Team Members',
            value: String(totalTeam),
            icon: 'ti-user',
            description: 'Under your management',
            subValue: '',
            link: '/resource-manager/team',
          },
          {
            label: 'Available',
            value: String(availableCount),
            icon: 'ti-check-box',
            description: `${busyCount} busy`,
            subValue: '',
            link: '/resource-manager/team',
          },
          {
            label: 'In Progress',
            value: String(inProgressCount),
            icon: 'ti-reload',
            description: 'Active projects',
            subValue: '',
            link: '/resource-manager/projects',
          },
          {
            label: 'Total Projects',
            value: String(totalProjects),
            icon: 'ti-briefcase',
            description: 'With your team assigned',
            subValue: '',
            link: '/resource-manager/projects',
          },
        ];

        this.teamMembers = allTeam.slice(0, 5);
        this.activeProjects = inProgressPaged?.data ?? [];

        this.projectsStatusChart = buildDonutChartOptions(
          'Projects',
          this.groupProjectStatus(allProjects)
        );
        this.teamAvailabilityChart = buildDonutChartOptions('Team', [
          { label: 'Available', count: availableCount },
          { label: 'Busy', count: busyCount },
        ]);

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  memberName(member: TeamMemberDto): string {
    return teamMemberDisplayName(member);
  }

  statusBadgeClass(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.text ?? String(status ?? '');
  }

  private groupProjectStatus(projects: ProjectDto[]): ChartCountItem[] {
    const statusLabels: Record<string, string> = {
      Pending: 'Pending',
      InProgress: 'In Progress',
      Completed: 'Completed',
      OnHold: 'On Hold',
      Cancelled: 'Cancelled',
    };

    return Object.entries(statusLabels)
      .map(([key, label]) => ({
        label,
        count: projects.filter(p => projectStatusKey(p.status) === key).length,
      }))
      .filter(item => item.count > 0);
  }
}
