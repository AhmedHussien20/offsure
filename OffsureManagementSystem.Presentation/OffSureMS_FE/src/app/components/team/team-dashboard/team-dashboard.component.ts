import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProjectStatus } from 'app/core/models/projects/project.models';
import { TeamMemberDto } from 'app/core/models/team-members/team-member.models';
import { ProjectsService } from 'app/core/services/projects.service';
import { TeamContextService } from 'app/core/services/team-context.service';
import { TeamPortalService } from 'app/core/services/team-portal.service';
import { DashboardStatisticsService } from 'app/core/services/dashboard-statistics.service';
import { projectStatusKey } from 'app/core/utils/enum-status.util';
import { displayRole } from 'app/core/utils/project-skill.util';
import {
  buildBarChartOptions,
  buildDonutChartOptions,
  chartHasData,
} from 'app/core/utils/dashboard-chart.util';
import { SpkApexChartsComponent } from 'app/@spk/reusable-charts/spk-apex-charts/spk-apex-charts.component';
import { SpkEcommerceComponent } from 'app/@spk/reusable-ecommerce/spk-ecommerce/spk-ecommerce.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { PROJECT_STATUS_BADGES } from '../../client/client.constants';

@Component({
  selector: 'app-team-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, SpkEcommerceComponent, SpkApexChartsComponent],
  templateUrl: './team-dashboard.component.html',
  styleUrl: './team-dashboard.component.scss',
})
export class TeamDashboardComponent implements OnInit {
  profile: TeamMemberDto | null = null;
  currentProjects: Array<{ id: number; name: string; clientName: string; status: string; myRole: string }> = [];
  loading = true;
  togglingAvailability = false;

  statCards: { label: string; value: string; icon: string; description: string; subValue: string }[] = [];

  projectsStatusChart: Record<string, unknown> | null = null;
  hoursByProjectChart: Record<string, unknown> | null = null;

  constructor(
    private teamContext: TeamContextService,
    private teamPortal: TeamPortalService,
    private projectsService: ProjectsService,
    private dashboardStatisticsService: DashboardStatisticsService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.teamContext.loadProfile().subscribe({
      next: profile => {
        this.profile = profile;
        if (!profile) {
          this.loading = false;
          return;
        }

        forkJoin({
          stats: this.dashboardStatisticsService.getTeam(),
          projects: this.projectsService.getTeamMy({
            pageIndex: 1,
            pageSize: 10,
            status: ProjectStatus.InProgress,
          }),
        }).subscribe({
          next: ({ stats, projects }) => {
            const data = stats.data;
            if (data) {
              this.statCards = [
                {
                  label: 'Assigned Projects',
                  value: String(data.totalAssignedProjects),
                  icon: 'ti-briefcase',
                  description: 'All time on your profile',
                  subValue: '',
                },
                {
                  label: 'In Progress',
                  value: String(data.inProgressProjects),
                  icon: 'ti-reload',
                  description: 'Active work',
                  subValue: '',
                },
                {
                  label: 'Skills',
                  value: String(data.skillsCount),
                  icon: 'ti-star',
                  description: 'Listed on your profile',
                  subValue: '',
                },
              ];
              this.projectsStatusChart = buildDonutChartOptions('My projects', data.projectsByStatus);
              this.hoursByProjectChart = chartHasData(data.hoursByProject)
                ? buildBarChartOptions('Hours by project', data.hoursByProject, true, 'Hours')
                : null;
            } else {
              this.buildStatCards(profile);
            }

            const rows = (projects.data?.data ?? []).filter(p =>
              p.teamMembers?.some(m => m.teamMemberId === profile.id)
            );
            this.currentProjects = rows.map(p => {
              const assignment = p.teamMembers!.find(m => m.teamMemberId === profile.id)!;
              return {
                id: p.id,
                name: p.name,
                clientName: p.clientName,
                status: projectStatusKey(p.status),
                myRole: assignment.role ?? '—',
              };
            });

            this.loading = false;
          },
          error: () => {
            this.loading = false;
          },
        });
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get availabilityLabel(): string {
    return this.profile?.isAvailable ? 'Available' : 'Busy';
  }

  toggleAvailability(): void {
    if (!this.profile || this.togglingAvailability) return;

    this.togglingAvailability = true;
    const next = !this.profile.isAvailable;
    this.teamPortal.updateAvailability({ isAvailable: next }).subscribe({
      next: res => {
        this.profile = res.data ?? this.profile;
        this.teamContext.loadProfile(true).subscribe();
        this.toastr.success(next ? 'You are now marked as available.' : 'You are now marked as busy.');
        this.togglingAvailability = false;
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to update availability.');
        this.togglingAvailability = false;
      },
    });
  }

  statusBadgeClass(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.text ?? String(status ?? '');
  }

  private buildStatCards(profile: TeamMemberDto): void {
    this.statCards = [
      {
        label: 'My Status',
        value: profile.isAvailable ? 'Available' : 'Busy',
        icon: 'ti-user',
        description: profile.isAvailable ? 'Ready for assignments' : 'Currently busy',
        subValue: '',
      },
      {
        label: 'Skills',
        value: String(profile.skillAssignments?.length ?? 0),
        icon: 'ti-star',
        description: 'Listed on your profile',
        subValue: '',
      },
      {
        label: 'Experience',
        value: `${profile.yearsOfExperience} yrs`,
        icon: 'ti-medall',
        description: profile.title || 'Team member',
        subValue: '',
      },
    ];
  }
}
