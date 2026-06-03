export interface ChartCountItem {
  label: string;
  count: number;
}

export interface AdminDashboardStatistics {
  totalClients: number;
  totalRequests: number;
  totalProjects: number;
  availableTeamMembers: number;
  busyTeamMembers: number;
  requestsByStatus: ChartCountItem[];
  projectsByStatus: ChartCountItem[];
  teamAvailability: ChartCountItem[];
  requestsByMonth: ChartCountItem[];
}

export interface ClientDashboardStatistics {
  totalRequests: number;
  activeProjects: number;
  completedProjects: number;
  requestsByStatus: ChartCountItem[];
  projectsByStatus: ChartCountItem[];
  requestsByMonth: ChartCountItem[];
}

export interface TeamDashboardStatistics {
  totalAssignedProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  skillsCount: number;
  projectsByStatus: ChartCountItem[];
  hoursByProject: ChartCountItem[];
}
