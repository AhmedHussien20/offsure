using OffsureManagementSystem.Application.DTOs.Dashboard;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IDashboardStatisticsService
    {
        Task<AdminDashboardStatisticsDto> GetAdminStatisticsAsync();
        Task<ClientDashboardStatisticsDto> GetClientStatisticsAsync(int userId);
        Task<TeamDashboardStatisticsDto> GetTeamStatisticsAsync(int userId);
    }
}
