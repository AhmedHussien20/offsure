using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.Dashboard;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using System.Security.Claims;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/dashboard")]
    [ApiController]
    [Authorize]
    public class DashboardController : BaseController
    {
        private readonly IDashboardStatisticsService _dashboardStatisticsService;

        public DashboardController(IDashboardStatisticsService dashboardStatisticsService)
        {
            _dashboardStatisticsService = dashboardStatisticsService;
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<AdminDashboardStatisticsDto>>> GetAdminStatistics()
        {
            var stats = await _dashboardStatisticsService.GetAdminStatisticsAsync();
            return Ok(ApiResponse<AdminDashboardStatisticsDto>.Ok(stats));
        }

        [HttpGet("client")]
        [Authorize(Roles = "Client")]
        public async Task<ActionResult<ApiResponse<ClientDashboardStatisticsDto>>> GetClientStatistics()
        {
            var stats = await _dashboardStatisticsService.GetClientStatisticsAsync(GetCurrentUserId());
            return Ok(ApiResponse<ClientDashboardStatisticsDto>.Ok(stats));
        }

        [HttpGet("team")]
        [Authorize(Roles = "TeamMember")]
        public async Task<ActionResult<ApiResponse<TeamDashboardStatisticsDto>>> GetTeamStatistics()
        {
            var stats = await _dashboardStatisticsService.GetTeamStatisticsAsync(GetCurrentUserId());
            return Ok(ApiResponse<TeamDashboardStatisticsDto>.Ok(stats));
        }

        [HttpGet("sales")]
        [Authorize(Roles = "Sales")]
        public async Task<ActionResult<ApiResponse<SalesDashboardStatisticsDto>>> GetSalesStatistics()
        {
            var stats = await _dashboardStatisticsService.GetSalesStatisticsAsync(GetCurrentUserId());
            return Ok(ApiResponse<SalesDashboardStatisticsDto>.Ok(stats));
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(claim, out var userId) || userId <= 0)
                throw new UnauthorizedAccessException("Invalid user context.");

            return userId;
        }
    }
}
