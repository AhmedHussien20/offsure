namespace OffsureManagementSystem.Application.DTOs.TimesheetDTOs
{
    public class UpsertTimesheetEntryDto
    {
        public int? Id { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class UpsertTimesheetDto
    {
        public int ProjectId { get; set; }
        public DateOnly WorkDate { get; set; }
        public List<UpsertTimesheetEntryDto> Entries { get; set; } = new();
    }

    public class AppendTimesheetEntriesDto
    {
        public int ProjectId { get; set; }
        public DateOnly WorkDate { get; set; }
        public List<UpsertTimesheetEntryDto> Entries { get; set; } = new();
    }

    public class UpdateTimesheetEntryDto
    {
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class TimesheetEntryDto
    {
        public int Id { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Hours { get; set; }
    }

    public class TimesheetDayDto
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int TeamMemberId { get; set; }
        public string TeamMemberName { get; set; } = string.Empty;
        public DateOnly WorkDate { get; set; }
        public decimal TotalHours { get; set; }
        public List<TimesheetEntryDto> Entries { get; set; } = new();
    }

    public enum TimesheetReportPeriod
    {
        Week = 0,
        Month = 1,
        FullPeriod = 2
    }

    public class TimesheetReportRequest
    {
        public int ProjectId { get; set; }
        public TimesheetReportPeriod Period { get; set; } = TimesheetReportPeriod.Week;
        public int? TeamMemberId { get; set; }
        public int? ResourceManagerUserId { get; set; }
        public DateOnly? RangeStart { get; set; }
        public DateOnly? RangeEnd { get; set; }
    }

    public class TimesheetReportRowDto
    {
        public DateOnly WorkDate { get; set; }
        public int TeamMemberId { get; set; }
        public string TeamMemberName { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Hours { get; set; }
    }

    public class TimesheetReportDto
    {
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public DateOnly RangeStart { get; set; }
        public DateOnly RangeEnd { get; set; }
        public decimal TotalHours { get; set; }
        public decimal? EstimatedRevenue { get; set; }
        public decimal? TotalCost { get; set; }
        public List<TimesheetReportRowDto> Rows { get; set; } = new();
    }

    public class HourlyProjectDaySummaryDto
    {
        public DateOnly Date { get; set; }
        public string DayLabel { get; set; } = string.Empty;
        public decimal Hours { get; set; }
        public bool IsToday { get; set; }
    }

    public class HourlyProjectResourceSummaryDto
    {
        public int TeamMemberId { get; set; }
        public string TeamMemberName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public decimal? CostRate { get; set; }
        public decimal TotalHours { get; set; }
    }

    public class HourlyProjectOverviewDto
    {
        public decimal HourlyRate { get; set; }
        public decimal TotalHoursLogged { get; set; }
        public decimal ThisWeekHours { get; set; }
        public decimal EstimatedRevenue { get; set; }
        public List<HourlyProjectDaySummaryDto> ThisWeek { get; set; } = new();
        public List<HourlyProjectResourceSummaryDto> Resources { get; set; } = new();
    }
}
