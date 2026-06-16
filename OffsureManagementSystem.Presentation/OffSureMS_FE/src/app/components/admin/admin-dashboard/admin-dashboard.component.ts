import { CommonModule } from '@angular/common';

import { Component, OnInit } from '@angular/core';

import { RouterModule } from '@angular/router';

import { forkJoin } from 'rxjs';

import { SpkApexChartsComponent } from 'app/@spk/reusable-charts/spk-apex-charts/spk-apex-charts.component';

import { SpkEcommerceComponent } from 'app/@spk/reusable-ecommerce/spk-ecommerce/spk-ecommerce.component';

import { AdminDashboardStatistics } from 'app/core/models/dashboard/dashboard-statistics.models';

import { ProjectDto, ProjectStatus } from 'app/core/models/projects/project.models';

import {

  ServiceRequestDto,

  ServiceRequestStatus,

} from 'app/core/models/services/service.models';

import { TeamMemberDto, teamMemberDisplayName } from 'app/core/models/team-members/team-member.models';

import { DashboardStatisticsService } from 'app/core/services/dashboard-statistics.service';

import { ProjectsService } from 'app/core/services/projects.service';

import { ServiceRequestsService } from 'app/core/services/service-requests.service';

import { TeamMembersService } from 'app/core/services/team-members.service';

import {

  buildBarChartOptions,

  buildDonutChartOptions,

  chartHasData,

} from 'app/core/utils/dashboard-chart.util';

import { serviceRequestStatusKey } from 'app/core/utils/enum-status.util';

import { SharedModule } from 'app/shared/shared.module';

import { SERVICE_REQUEST_STATUS_BADGES } from '../admin.constants';



@Component({

  selector: 'app-admin-dashboard',

  standalone: true,

  imports: [CommonModule, SharedModule, RouterModule, SpkEcommerceComponent, SpkApexChartsComponent],

  templateUrl: './admin-dashboard.component.html',

  styleUrl: './admin-dashboard.component.scss',

})

export class AdminDashboardComponent implements OnInit {

  loading = true;

  statCards: { label: string; value: string; icon: string; description: string; link: string }[] = [];

  pendingRequests: ServiceRequestDto[] = [];

  activeProjects: ProjectDto[] = [];

  teamMembers: TeamMemberDto[] = [];



  requestsStatusChart: Record<string, unknown> | null = null;

  projectsStatusChart: Record<string, unknown> | null = null;

  teamAvailabilityChart: Record<string, unknown> | null = null;

  requestsTrendChart: Record<string, unknown> | null = null;



  private readonly avatarToneClasses = [

    'bg-primary-transparent text-primary',

    'bg-success-transparent text-success',

    'bg-warning-transparent text-warning',

    'bg-info-transparent text-info',

  ];



  constructor(

    private serviceRequestsService: ServiceRequestsService,

    private projectsService: ProjectsService,

    private teamMembersService: TeamMembersService,

    private dashboardStatisticsService: DashboardStatisticsService

  ) {}



  ngOnInit(): void {

    forkJoin({

      pending: this.serviceRequestsService.getAll({ pageIndex: 1, pageSize: 5 }),

      projects: this.projectsService.getAll({

        pageIndex: 1,

        pageSize: 4,

        status: ProjectStatus.InProgress,

      }),

      team: this.teamMembersService.getAll({ pageIndex: 1, pageSize: 5 }),

      stats: this.dashboardStatisticsService.getAdmin(),

    }).subscribe({

      next: res => {

        const requests = res.pending.data?.data ?? [];

        this.pendingRequests = requests

          .filter(r => {

            const status = serviceRequestStatusKey(r.status);

            return (

              status === ServiceRequestStatus.Pending ||

              status === ServiceRequestStatus.PrimaryAccepted ||

              status === ServiceRequestStatus.AcceptedWithProject

            );

          })

          .slice(0, 5);



        this.activeProjects = (res.projects.data?.data ?? []).slice(0, 4);

        this.teamMembers = (res.team.data?.data ?? []).slice(0, 6);



        const stats = res.stats.data;

        if (stats) {

          this.applyStatistics(stats);

        } else {

          this.buildFallbackStatCards(requests);

        }



        this.loading = false;

      },

      error: () => {

        this.loading = false;

      },

    });

  }



  hasChartData = chartHasData;



  requestStatusBadge(status: unknown): { text: string; class: string } {

    const key = serviceRequestStatusKey(status);

    return SERVICE_REQUEST_STATUS_BADGES[key] ?? { text: String(status ?? ''), class: 'bg-light' };

  }



  projectProgress(project: ProjectDto): number {

    const value = project.progress ?? 0;

    return Math.min(100, Math.max(0, Math.round(value)));

  }



  progressBarClass(progress: number): string {

    if (progress >= 75) return 'bg-success';

    if (progress >= 40) return 'bg-primary';

    return 'bg-warning';

  }



  progressTextClass(progress: number): string {

    if (progress >= 75) return 'text-success';

    if (progress >= 40) return 'text-primary';

    return 'text-warning';

  }



  memberName(member: TeamMemberDto): string {

    return teamMemberDisplayName(member);

  }



  memberInitials(member: TeamMemberDto): string {

    const parts = teamMemberDisplayName(member).trim().split(/\s+/);

    if (parts.length === 0) return '?';

    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();

  }



  memberAvatarClass(index: number): string {

    return this.avatarToneClasses[index % this.avatarToneClasses.length];

  }



  availabilityClass(isAvailable: boolean): string {

    return isAvailable ? 'bg-success' : 'bg-danger';

  }



  private applyStatistics(stats: AdminDashboardStatistics): void {

    this.statCards = [

      {

        label: 'Total Requests',

        value: String(stats.totalRequests),

        icon: 'ti-clipboard',

        description: 'All service requests',

        link: '/admin/requests',

      },

      {

        label: 'Active Projects',

        value: String(

          stats.projectsByStatus.find(p => p.label === 'In Progress')?.count ?? stats.totalProjects

        ),

        icon: 'ti-folder',

        description: 'In progress',

        link: '/admin/projects',

      },

      {

        label: 'Available Team',

        value: String(stats.availableTeamMembers),

        icon: 'ti-user',

        description: `${stats.busyTeamMembers} busy`,

        link: '/admin/team',

      },

      {

        label: 'Total Clients',

        value: String(stats.totalClients),

        icon: 'ti-briefcase',

        description: 'Active companies',

        link: '/admin/clients',

      },

    ];



    this.requestsStatusChart = buildDonutChartOptions('Requests', stats.requestsByStatus);

    this.projectsStatusChart = buildDonutChartOptions('Projects', stats.projectsByStatus);

    this.teamAvailabilityChart = buildDonutChartOptions('Team', stats.teamAvailability);

    this.requestsTrendChart = buildBarChartOptions('New requests (6 months)', stats.requestsByMonth);

  }



  private buildFallbackStatCards(requests: ServiceRequestDto[]): void {

    this.statCards = [

      {

        label: 'New Requests',

        value: String(

          requests.filter(r => serviceRequestStatusKey(r.status) === ServiceRequestStatus.Pending).length

        ),

        icon: 'ti-clipboard',

        description: 'Pending approval',

        link: '/admin/requests',

      },

      {

        label: 'Active Projects',

        value: String(this.activeProjects.length),

        icon: 'ti-folder',

        description: 'In progress',

        link: '/admin/projects',

      },

      {

        label: 'Available Team',

        value: String(this.teamMembers.filter(m => m.isAvailable).length),

        icon: 'ti-user',

        description: 'Ready to assign',

        link: '/admin/team',

      },

      {

        label: 'Total Clients',

        value: '—',

        icon: 'ti-briefcase',

        description: 'Registered companies',

        link: '/admin/clients',

      },

    ];

  }

}


