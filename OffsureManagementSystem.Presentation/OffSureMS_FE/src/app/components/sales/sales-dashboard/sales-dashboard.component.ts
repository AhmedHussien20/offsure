import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SpkApexChartsComponent } from 'app/@spk/reusable-charts/spk-apex-charts/spk-apex-charts.component';
import { SpkEcommerceComponent } from 'app/@spk/reusable-ecommerce/spk-ecommerce/spk-ecommerce.component';
import { ChartCountItem } from 'app/core/models/dashboard/dashboard-statistics.models';
import { ClientDto } from 'app/core/models/clients/client.models';
import { ProjectStatus, SalesProjectSummaryDto } from 'app/core/models/projects/project.models';
import { SalesService } from 'app/core/services/sales.service';
import { buildDonutChartOptions } from 'app/core/utils/dashboard-chart.util';
import { projectStatusKey } from 'app/core/utils/enum-status.util';
import { SharedModule } from 'app/shared/shared.module';
import { PROJECT_STATUS_BADGES } from '../../admin/admin.constants';

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

  constructor(private salesService: SalesService) {}

  ngOnInit(): void {
    forkJoin({
      projects: this.salesService.getMyProjects({ pageIndex: 1, pageSize: 100 }),
      clients: this.salesService.getClients({ pageIndex: 1, pageSize: 100 }),
      inProgress: this.salesService.getMyProjects({
        pageIndex: 1,
        pageSize: 5,
        status: ProjectStatus.InProgress,
      }),
      teamPool: this.salesService.browseTeamMembers({ pageIndex: 1, pageSize: 1 }),
    }).subscribe({
      next: ({ projects, clients, inProgress, teamPool }) => {
        const allProjects = projects.data?.data ?? [];
        const allClients = clients.data?.data ?? [];
        const totalProjects = projects.data?.totalCount ?? allProjects.length;
        const totalClients = clients.data?.totalCount ?? allClients.length;
        const inProgressCount = inProgress.data?.totalCount ?? 0;
        const teamPoolCount = teamPool.data?.totalCount ?? 0;
        const withCommission = allProjects.filter(
          p => p.commissionValue != null && p.commissionValue > 0
        ).length;

        this.statCards = [
          {
            label: 'My Clients',
            value: String(totalClients),
            icon: 'ti-briefcase',
            description: 'Linked to your account',
            subValue: '',
            link: '/sales/clients',
          },
          {
            label: 'My Projects',
            value: String(totalProjects),
            icon: 'ti-folder',
            description: `${withCommission} with commission`,
            subValue: '',
            link: '/sales/projects',
          },
          {
            label: 'In Progress',
            value: String(inProgressCount),
            icon: 'ti-reload',
            description: 'Active projects',
            subValue: '',
            link: '/sales/projects',
          },
          {
            label: 'Team Pool',
            value: String(teamPoolCount),
            icon: 'ti-id-badge',
            description: 'Members to browse',
            subValue: '',
            link: '/sales/team-members',
          },
        ];

        this.clients = allClients.slice(0, 5);
        this.activeProjects = inProgress.data?.data ?? [];

        this.projectsStatusChart = buildDonutChartOptions('Projects', this.groupProjectStatus(allProjects));

        const activeClients = allClients.filter(c => c.isActive).length;
        this.clientsStatusChart = buildDonutChartOptions('Clients', [
          { label: 'Active', count: activeClients },
          { label: 'Inactive', count: allClients.length - activeClients },
        ]);

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

  private groupProjectStatus(projects: SalesProjectSummaryDto[]): ChartCountItem[] {
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
