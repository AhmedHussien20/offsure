import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SpkEcommerceComponent } from 'app/@spk/reusable-ecommerce/spk-ecommerce/spk-ecommerce.component';
import { ProjectDto, ProjectStatus } from 'app/core/models/projects/project.models';
import {
  ServiceRequestDto,
  ServiceRequestStatus,
} from 'app/core/models/services/service.models';
import { TeamMemberDto, teamMemberDisplayName } from 'app/core/models/team-members/team-member.models';
import { ClientsService } from 'app/core/services/clients.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { serviceRequestStatusKey } from 'app/core/utils/enum-status.util';
import { SharedModule } from 'app/shared/shared.module';
import { SERVICE_REQUEST_STATUS_BADGES } from '../admin.constants';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, SpkEcommerceComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  loading = true;
  statCards: { label: string; value: string; icon: string; description: string; link: string }[] = [];
  pendingRequests: ServiceRequestDto[] = [];
  activeProjects: ProjectDto[] = [];
  teamMembers: TeamMemberDto[] = [];

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
    private clientsService: ClientsService
  ) {}

  ngOnInit(): void {
    forkJoin({
      pending: this.serviceRequestsService.getAll({
        pageIndex: 1,
        pageSize: 20,
      }),
      projects: this.projectsService.getAll({
        pageIndex: 1,
        pageSize: 4,
        status: ProjectStatus.InProgress,
      }),
      team: this.teamMembersService.getAll({
        pageIndex: 1,
        pageSize: 6,
      }),
      clients: this.clientsService.getAll({ pageIndex: 1, pageSize: 1 }),
    }).subscribe({
      next: res => {
        const requests = res.pending.data?.data ?? [];
        this.pendingRequests = requests
          .filter(r => {
            const status = serviceRequestStatusKey(r.status);
            return (
              status === ServiceRequestStatus.Pending ||
              status === ServiceRequestStatus.InProgress
            );
          })
          .slice(0, 5);

        this.activeProjects = (res.projects.data?.data ?? []).slice(0, 4);
        this.teamMembers = (res.team.data?.data ?? []).slice(0, 6);

        this.statCards = [
          {
            label: 'New Requests',
            value: String(
              requests.filter(r => serviceRequestStatusKey(r.status) === ServiceRequestStatus.Pending)
                .length
            ),
            icon: 'ti-clipboard',
            description: 'Pending approval',
            link: '/admin/requests',
          },
          {
            label: 'Active Projects',
            value: String(res.projects.data?.totalCount ?? this.activeProjects.length),
            icon: 'ti-folder',
            description: 'In progress',
            link: '/admin/projects',
          },
          {
            label: 'Available Team',
            value: String(
              (res.team.data?.data ?? []).filter(m => m.isAvailable).length
            ),
            icon: 'ti-user',
            description: 'Ready to assign',
            link: '/admin/team',
          },
          {
            label: 'Total Clients',
            value: String(res.clients.data?.totalCount ?? 0),
            icon: 'ti-briefcase',
            description: 'Registered companies',
            link: '/admin/clients',
          },
        ];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  requestStatusBadge(status: unknown): { text: string; class: string } {
    const key = serviceRequestStatusKey(status);
    return SERVICE_REQUEST_STATUS_BADGES[key] ?? { text: String(status ?? ''), class: 'bg-light' };
  }

  projectProgress(project: ProjectDto): number {
    const value = project.progress ?? 0;
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  progressBarClass(progress: number): string {
    if (progress >= 75) {
      return 'bg-success';
    }
    if (progress >= 40) {
      return 'bg-primary';
    }
    return 'bg-warning';
  }

  progressTextClass(progress: number): string {
    if (progress >= 75) {
      return 'text-success';
    }
    if (progress >= 40) {
      return 'text-primary';
    }
    return 'text-warning';
  }

  memberName(member: TeamMemberDto): string {
    return teamMemberDisplayName(member);
  }

  memberInitials(member: TeamMemberDto): string {
    const parts = teamMemberDisplayName(member).trim().split(/\s+/);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  memberAvatarClass(index: number): string {
    return this.avatarToneClasses[index % this.avatarToneClasses.length];
  }

  availabilityClass(isAvailable: boolean): string {
    return isAvailable ? 'bg-success' : 'bg-danger';
  }
}
