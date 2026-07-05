import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BaseResponse } from '../models/base.response';
import {
  AdminDashboardStatistics,
  ChartCountItem,
  ClientDashboardStatistics,
  SalesDashboardStatistics,
  TeamDashboardStatistics,
} from '../models/dashboard/dashboard-statistics.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DashboardStatisticsService {
  private readonly service = 'dashboard';

  constructor(private api: ApiService) {}

  getAdmin(): Observable<BaseResponse<AdminDashboardStatistics>> {
    return this.api
      .get<BaseResponse<AdminDashboardStatistics>>(this.service, 'admin')
      .pipe(map(res => ({ ...res, data: this.mapAdmin(res.data)! })));
  }

  getClient(): Observable<BaseResponse<ClientDashboardStatistics>> {
    return this.api
      .get<BaseResponse<ClientDashboardStatistics>>(this.service, 'client')
      .pipe(map(res => ({ ...res, data: this.mapClient(res.data)! })));
  }

  getTeam(): Observable<BaseResponse<TeamDashboardStatistics>> {
    return this.api
      .get<BaseResponse<TeamDashboardStatistics>>(this.service, 'team')
      .pipe(map(res => ({ ...res, data: this.mapTeam(res.data)! })));
  }

  getSales(): Observable<BaseResponse<SalesDashboardStatistics>> {
    return this.api
      .get<BaseResponse<SalesDashboardStatistics>>(this.service, 'sales')
      .pipe(map(res => ({ ...res, data: this.mapSales(res.data)! })));
  }

  private mapAdmin(dto?: AdminDashboardStatistics): AdminDashboardStatistics {
    if (!dto) {
      return {
        totalClients: 0,
        totalRequests: 0,
        totalProjects: 0,
        availableTeamMembers: 0,
        busyTeamMembers: 0,
        requestsByStatus: [],
        projectsByStatus: [],
        teamAvailability: [],
        requestsByMonth: [],
      };
    }
    return {
      ...dto,
      requestsByStatus: dto.requestsByStatus ?? [],
      projectsByStatus: dto.projectsByStatus ?? [],
      teamAvailability: dto.teamAvailability ?? [],
      requestsByMonth: dto.requestsByMonth ?? [],
    };
  }

  private mapClient(dto?: ClientDashboardStatistics): ClientDashboardStatistics {
    if (!dto) {
      return {
        totalRequests: 0,
        activeProjects: 0,
        completedProjects: 0,
        requestsByStatus: [],
        projectsByStatus: [],
        requestsByMonth: [],
      };
    }
    return {
      ...dto,
      requestsByStatus: dto.requestsByStatus ?? [],
      projectsByStatus: dto.projectsByStatus ?? [],
      requestsByMonth: dto.requestsByMonth ?? [],
    };
  }

  private mapTeam(dto?: TeamDashboardStatistics): TeamDashboardStatistics {
    if (!dto) {
      return {
        totalAssignedProjects: 0,
        inProgressProjects: 0,
        completedProjects: 0,
        skillsCount: 0,
        projectsByStatus: [],
        hoursByProject: [],
      };
    }
    return {
      ...dto,
      projectsByStatus: this.mapChartItems(dto.projectsByStatus),
      hoursByProject: this.mapChartItems(dto.hoursByProject),
    };
  }

  private mapChartItems(
    items?: Array<ChartCountItem & { Label?: string; Count?: number }>
  ): ChartCountItem[] {
    return (items ?? []).map(item => ({
      label: item.label ?? item.Label ?? '',
      count: Number(item.count ?? item.Count ?? 0),
    }));
  }

  private mapSales(dto?: SalesDashboardStatistics): SalesDashboardStatistics {
    if (!dto) {
      return {
        totalClients: 0,
        totalProjects: 0,
        inProgressProjects: 0,
        projectsWithCommission: 0,
        teamPoolCount: 0,
        projectsByStatus: [],
        clientsByStatus: [],
      };
    }
    return {
      ...dto,
      projectsByStatus: dto.projectsByStatus ?? [],
      clientsByStatus: dto.clientsByStatus ?? [],
    };
  }
}
