using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.TimesheetDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using System.Security.Claims;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/timesheets")]
    [ApiController]
    [Authorize]
    public class TimesheetsController : BaseController
    {
        private readonly ITimesheetService _timesheetService;

        public TimesheetsController(ITimesheetService timesheetService)
        {
            _timesheetService = timesheetService;
        }

        [HttpGet("day")]
        [Authorize(Roles = "TeamMember")]
        public async Task<ActionResult<ApiResponse<TimesheetDayDto?>>> GetDay(
            [FromQuery] int projectId,
            [FromQuery] DateOnly workDate)
        {
            var sheet = await _timesheetService.GetTimesheetDayAsync(GetCurrentUserId(), projectId, workDate);
            return Ok(ApiResponse<TimesheetDayDto?>.Ok(sheet));
        }

        [HttpPut("day")]
        [Authorize(Roles = "TeamMember")]
        public async Task<ActionResult<ApiResponse<TimesheetDayDto>>> UpsertDay(
            [FromBody] UpsertTimesheetDto dto)
        {
            var sheet = await _timesheetService.UpsertTimesheetDayAsync(GetCurrentUserId(), dto);
            return Ok(ApiResponse<TimesheetDayDto>.Ok(sheet));
        }

        [HttpPost("day/entries")]
        [Authorize(Roles = "TeamMember")]
        public async Task<ActionResult<ApiResponse<TimesheetDayDto>>> AppendEntries(
            [FromBody] AppendTimesheetEntriesDto dto)
        {
            var sheet = await _timesheetService.AppendTimesheetEntriesAsync(GetCurrentUserId(), dto);
            return Ok(ApiResponse<TimesheetDayDto>.Ok(sheet));
        }

        [HttpPut("day/entries/{entryId:int}")]
        [Authorize(Roles = "TeamMember")]
        public async Task<ActionResult<ApiResponse<TimesheetDayDto>>> UpdateEntry(
            int entryId,
            [FromBody] UpdateTimesheetEntryDto dto)
        {
            var sheet = await _timesheetService.UpdateTimesheetEntryAsync(GetCurrentUserId(), entryId, dto);
            return Ok(ApiResponse<TimesheetDayDto>.Ok(sheet));
        }

        [HttpGet("projects/{projectId:int}/overview")]
        [Authorize(Roles = "Administrator,ResourceManager")]
        public async Task<ActionResult<ApiResponse<HourlyProjectOverviewDto>>> GetProjectOverview(int projectId)
        {
            var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            var overview = await _timesheetService.GetHourlyProjectOverviewAsync(GetCurrentUserId(), role, projectId);
            return Ok(ApiResponse<HourlyProjectOverviewDto>.Ok(overview));
        }

        [HttpGet("report")]
        [Authorize(Roles = "Administrator,ResourceManager,TeamMember")]
        public async Task<ActionResult<ApiResponse<TimesheetReportDto>>> GetReport(
            [FromQuery] TimesheetReportRequest request)
        {
            var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            var report = await _timesheetService.GetReportAsync(GetCurrentUserId(), role, request);
            return Ok(ApiResponse<TimesheetReportDto>.Ok(report));
        }

        private int GetCurrentUserId()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
                throw new UnauthorizedAccessException("Invalid user token.");

            return userId;
        }
    }
}
