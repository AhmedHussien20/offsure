namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class TimesheetEntry : BaseEntity
    {
        public int TimesheetId { get; set; }
        /// <summary>Minutes from midnight (0–1430, 10-minute increments).</summary>
        public int StartMinutes { get; set; }
        /// <summary>Minutes from midnight (10–1440, 10-minute increments).</summary>
        public int EndMinutes { get; set; }
        public string Description { get; set; } = string.Empty;
        /// <summary>Computed duration in decimal hours.</summary>
        public decimal Hours { get; set; }

        public virtual Timesheet Timesheet { get; set; }
    }
}
