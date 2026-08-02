using OffsureManagementSystem.Application.DTOs.TimesheetDTOs;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ITimesheetService
    {
        Task<TimesheetDayDto?> GetTimesheetDayAsync(int userId, int projectId, DateOnly workDate);
        Task<TimesheetDayDto> UpsertTimesheetDayAsync(int userId, UpsertTimesheetDto dto);
        Task<TimesheetDayDto> AppendTimesheetEntriesAsync(int userId, AppendTimesheetEntriesDto dto);
        Task<TimesheetDayDto> UpdateTimesheetEntryAsync(int userId, int entryId, UpdateTimesheetEntryDto dto);
        Task<TimesheetDayDto> DeleteTimesheetEntryAsync(int userId, int entryId);
        Task<HourlyProjectOverviewDto> GetHourlyProjectOverviewAsync(int userId, string role, int projectId);
        Task<TimesheetReportDto> GetReportAsync(int userId, string role, TimesheetReportRequest request);
    }
}
