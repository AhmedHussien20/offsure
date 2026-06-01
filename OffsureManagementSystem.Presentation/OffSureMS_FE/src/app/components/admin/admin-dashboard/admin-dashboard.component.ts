import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SpkEcommerceComponent } from 'app/@spk/reusable-ecommerce/spk-ecommerce/spk-ecommerce.component';
import { ProjectStatus } from 'app/core/models/projects/project.models';
import { ServiceRequestStatus } from 'app/core/models/services/service.models';
import { ClientsService } from 'app/core/services/clients.service';
import { ProjectsService } from 'app/core/services/projects.service';
import { ServiceRequestsService } from 'app/core/services/service-requests.service';
import { TeamMembersService } from 'app/core/services/team-members.service';
import { SharedModule } from 'app/shared/shared.module';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, SpkEcommerceComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  loading = true;
  statCards: { label: string; value: string; icon: string; description: string; link: string }[] = [];

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
        pageSize: 1,
        status: ServiceRequestStatus.Pending,
      } as any),
      projects: this.projectsService.getAll({
        pageIndex: 1,
        pageSize: 1,
        status: ProjectStatus.InProgress,
      } as any),
      team: this.teamMembersService.getAll({
        pageIndex: 1,
        pageSize: 1,
        isAvailable: true,
      } as any),
      clients: this.clientsService.getAll({ pageIndex: 1, pageSize: 1 } as any),
    }).subscribe({
      next: res => {
        this.statCards = [
          {
            label: 'New Requests',
            value: String(res.pending.data?.totalCount ?? 0),
            icon: 'ti-clipboard',
            description: 'Pending approval',
            link: '/admin/requests',
          },
          {
            label: 'Active Projects',
            value: String(res.projects.data?.totalCount ?? 0),
            icon: 'ti-folder',
            description: 'In progress',
            link: '/admin/projects',
          },
          {
            label: 'Available Team',
            value: String(res.team.data?.totalCount ?? 0),
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
}
