import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SpkApexChartsComponent } from 'app/@spk/reusable-charts/spk-apex-charts/spk-apex-charts.component';
import { SpkEcommerceComponent } from 'app/@spk/reusable-ecommerce/spk-ecommerce/spk-ecommerce.component';
import { ClientContextService } from 'app/core/services/client-context.service';
import { ClientsService } from 'app/core/services/clients.service';
import { ClientDto, ClientServiceRequestSummaryDto } from 'app/core/models/clients/client.models';
import { ProjectsService } from 'app/core/services/projects.service';
import { ProjectDto, ProjectStatus } from 'app/core/models/projects/project.models';
import { DashboardStatisticsService } from 'app/core/services/dashboard-statistics.service';
import { SharedModule } from 'app/shared/shared.module';
import { serviceRequestStatusKey } from 'app/core/utils/enum-status.util';
import {
  buildBarChartOptions,
  buildDonutChartOptions,
} from 'app/core/utils/dashboard-chart.util';
import { forkJoin } from 'rxjs';
import { SERVICE_REQUEST_STATUS_BADGES } from '../client.constants';
import { ClientRequestCreateComponent } from '../client-request-form/client-request-create.component';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, SpkEcommerceComponent, SpkApexChartsComponent],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss',
})
export class ClientDashboardComponent implements OnInit {
  profile: ClientDto | null = null;
  recentRequests: ClientServiceRequestSummaryDto[] = [];
  ongoingProjects: ProjectDto[] = [];
  loading = true;

  statCards: { label: string; value: string; icon: string; description: string; subValue: string }[] = [];

  requestsStatusChart: Record<string, unknown> | null = null;
  projectsStatusChart: Record<string, unknown> | null = null;
  requestsTrendChart: Record<string, unknown> | null = null;

  constructor(
    private clientContext: ClientContextService,
    private clientsService: ClientsService,
    private projectsService: ProjectsService,
    private dashboardStatisticsService: DashboardStatisticsService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.clientContext.loadProfile().subscribe({
      next: profile => {
        this.profile = profile;
        if (!profile) {
          this.loading = false;
          return;
        }

        forkJoin({
          recent: this.clientsService.getProfileRecentRequests(5),
          ongoing: this.projectsService.getMy({
            pageIndex: 1,
            pageSize: 5,
            status: ProjectStatus.InProgress,
          }),
          stats: this.dashboardStatisticsService.getClient(),
        }).subscribe({
          next: ({ recent, ongoing, stats }) => {
            this.recentRequests = recent.data ?? [];
            const ongoingPaged = ongoing.data;
            this.ongoingProjects = ongoingPaged?.data ?? [];

            const data = stats.data;
            if (data) {
              this.statCards = [
                {
                  label: 'Total Requests',
                  value: String(data.totalRequests),
                  icon: 'ti-clipboard',
                  description: 'All service requests',
                  subValue: '',
                },
                {
                  label: 'Active Projects',
                  value: String(data.activeProjects),
                  icon: 'ti-folder',
                  description: 'In progress',
                  subValue: '',
                },
                {
                  label: 'Completed',
                  value: String(data.completedProjects),
                  icon: 'ti-check-box',
                  description: 'Finished projects',
                  subValue: '',
                },
              ];
              this.requestsStatusChart = buildDonutChartOptions('My requests', data.requestsByStatus);
              this.projectsStatusChart = buildBarChartOptions('My projects', data.projectsByStatus);
              this.requestsTrendChart = buildBarChartOptions(
                'Requests over time (6 months)',
                data.requestsByMonth
              );
            } else {
              this.statCards = [
                {
                  label: 'Total Requests',
                  value: String(profile.requestsCount),
                  icon: 'ti-clipboard',
                  description: 'All service requests',
                  subValue: '',
                },
                {
                  label: 'Active Projects',
                  value: String(ongoingPaged?.totalCount ?? this.ongoingProjects.length),
                  icon: 'ti-folder',
                  description: 'Projects in progress',
                  subValue: '',
                },
                {
                  label: 'Company',
                  value: profile.companyName || '—',
                  icon: 'ti-briefcase',
                  description: profile.email,
                  subValue: '',
                },
              ];
            }

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

  statusBadgeClass(status: unknown): string {
    return SERVICE_REQUEST_STATUS_BADGES[serviceRequestStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return (
      SERVICE_REQUEST_STATUS_BADGES[serviceRequestStatusKey(status)]?.text ??
      String(status ?? '')
    );
  }

  openNewRequestModal(): void {
    this.modalService.open(ClientRequestCreateComponent, {
      centered: true,
      size: 'lg',
    });
  }
}
