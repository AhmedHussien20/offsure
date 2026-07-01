namespace OffsureManagementSystem.Application.DTOs.Dashboard
{
    public class ChartCountItemDto
    {
        public string Label { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class AdminDashboardStatisticsDto
    {
        public int TotalClients { get; set; }
        public int TotalRequests { get; set; }
        public int TotalProjects { get; set; }
        public int AvailableTeamMembers { get; set; }
        public int BusyTeamMembers { get; set; }
        public List<ChartCountItemDto> RequestsByStatus { get; set; } = new();
        public List<ChartCountItemDto> ProjectsByStatus { get; set; } = new();
        public List<ChartCountItemDto> TeamAvailability { get; set; } = new();
        public List<ChartCountItemDto> RequestsByMonth { get; set; } = new();
    }

    public class ClientDashboardStatisticsDto
    {
        public int TotalRequests { get; set; }
        public int ActiveProjects { get; set; }
        public int CompletedProjects { get; set; }
        public List<ChartCountItemDto> RequestsByStatus { get; set; } = new();
        public List<ChartCountItemDto> ProjectsByStatus { get; set; } = new();
        public List<ChartCountItemDto> RequestsByMonth { get; set; } = new();
    }

    public class TeamDashboardStatisticsDto
    {
        public int TotalAssignedProjects { get; set; }
        public int InProgressProjects { get; set; }
        public int CompletedProjects { get; set; }
        public int SkillsCount { get; set; }
        public List<ChartCountItemDto> ProjectsByStatus { get; set; } = new();
        public List<ChartCountItemDto> HoursByProject { get; set; } = new();
    }

    public class SalesDashboardStatisticsDto
    {
        public int TotalClients { get; set; }
        public int TotalProjects { get; set; }
        public int InProgressProjects { get; set; }
        public int ProjectsWithCommission { get; set; }
        public int TeamPoolCount { get; set; }
        public List<ChartCountItemDto> ProjectsByStatus { get; set; } = new();
        public List<ChartCountItemDto> ClientsByStatus { get; set; } = new();
    }
}
