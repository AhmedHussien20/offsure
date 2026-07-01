import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SpkApexChartsComponent } from 'app/@spk/reusable-charts/spk-apex-charts/spk-apex-charts.component';
import { SpkEcommerceComponent } from 'app/@spk/reusable-ecommerce/spk-ecommerce/spk-ecommerce.component';
import { ClientDto } from 'app/core/models/clients/client.models';
import { ProjectStatus, SalesProjectSummaryDto } from 'app/core/models/projects/project.models';
import { DashboardStatisticsService } from 'app/core/services/dashboard-statistics.service';
import { SalesService } from 'app/core/services/sales.service';
import { buildDonutChartOptions } from 'app/core/utils/dashboard-chart.util';
import { projectStatusKey } from 'app/core/utils/enum-status.util';
import { SharedModule } from 'app/shared/shared.module';
import { PROJECT_STATUS_BADGES } from '../../admin/admin.constants';

const DASHBOARD_LIST_PAGE_SIZE = 5;

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, SpkEcommerceComponent, SpkApexChartsComponent],
  templateUrl: './sales-dashboard.component.html',
  styleUrl: './sales-dashboard.component.scss',
})
export class SalesDashboardComponent implements OnInit {
  loading = true;

  statCards: { label: string; value: string; icon: string; description: string; subValue: string; link: string }[] =
    [];

  clients: ClientDto[] = [];
  activeProjects: SalesProjectSummaryDto[] = [];

  projectsStatusChart: Record<string, unknown> | null = null;
  clientsStatusChart: Record<string, unknown> | null = null;

  constructor(
    private salesService: SalesService,
    private dashboardStatisticsService: DashboardStatisticsService
  ) {}

  ngOnInit(): void {
    forkJoin({
      stats: this.dashboardStatisticsService.getSales(),
      clients: this.salesService.getClients({ pageIndex: 1, pageSize: DASHBOARD_LIST_PAGE_SIZE }),
      inProgress: this.salesService.getMyProjects({
        pageIndex: 1,
        pageSize: DASHBOARD_LIST_PAGE_SIZE,
        status: ProjectStatus.InProgress,
      }),
    }).subscribe({
      next: ({ stats, clients, inProgress }) => {
        const data = stats.data;
        if (data) {
          this.statCards = [
            {
              label: 'My Clients',
              value: String(data.totalClients),
              icon: 'ti-briefcase',
              description: 'Linked to your account',
              subValue: '',
              link: '/sales/clients',
            },
            {
              label: 'My Projects',
              value: String(data.totalProjects),
              icon: 'ti-folder',
              description: `${data.projectsWithCommission} with commission`,
              subValue: '',
              link: '/sales/projects',
            },
            {
              label: 'In Progress',
              value: String(data.inProgressProjects),
              icon: 'ti-reload',
              description: 'Active projects',
              subValue: '',
              link: '/sales/projects',
            },
            {
              label: 'Team Pool',
              value: String(data.teamPoolCount),
              icon: 'ti-id-badge',
              description: 'Members to browse',
              subValue: '',
              link: '/sales/team-members',
            },
          ];

          this.projectsStatusChart =
            data.projectsByStatus.length > 0
              ? buildDonutChartOptions('Projects', data.projectsByStatus)
              : null;

          this.clientsStatusChart =
            data.clientsByStatus.length > 0
              ? buildDonutChartOptions('Clients', data.clientsByStatus)
              : null;
        }

        this.clients = clients.data?.data ?? [];
        this.activeProjects = inProgress.data?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  statusBadgeClass(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.class ?? 'bg-light';
  }

  statusLabel(status: unknown): string {
    return PROJECT_STATUS_BADGES[projectStatusKey(status)]?.text ?? String(status ?? '');
  }

  formatCommission(project: SalesProjectSummaryDto): string {
    if (project.calculatedCommissionAmount != null && project.calculatedCommissionAmount > 0) {
      return `$${project.calculatedCommissionAmount.toLocaleString()}`;
    }
    if (project.commissionValue == null) {
      return '—';
    }
    if (project.commissionType === 'Percentage') {
      return `${project.commissionValue}%`;
    }
    return `$${project.commissionValue.toLocaleString()}`;
  }
}
