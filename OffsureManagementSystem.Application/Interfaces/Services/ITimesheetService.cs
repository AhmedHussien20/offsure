using OffsureManagementSystem.Application.DTOs.TimesheetDTOs;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ITimesheetService
    {
        Task<TimesheetDayDto?> GetTimesheetDayAsync(int userId, string role, int projectId, DateOnly workDate, int? teamMemberId);
        Task<TimesheetDayDto> UpsertTimesheetDayAsync(int userId, string role, UpsertTimesheetDto dto);
        Task<TimesheetDayDto> AppendTimesheetEntriesAsync(int userId, string role, AppendTimesheetEntriesDto dto);
        Task<TimesheetDayDto> UpdateTimesheetEntryAsync(int userId, string role, int entryId, UpdateTimesheetEntryDto dto);
        Task<TimesheetDayDto> DeleteTimesheetEntryAsync(int userId, string role, int entryId);
        Task<HourlyProjectOverviewDto> GetHourlyProjectOverviewAsync(int userId, string role, int projectId);
        Task<TimesheetReportDto> GetReportAsync(int userId, string role, TimesheetReportRequest request);
    }
}
