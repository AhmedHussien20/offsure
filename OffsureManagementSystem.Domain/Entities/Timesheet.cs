namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    /// <summary>One record per project + team member + calendar day.</summary>
    public class Timesheet : BaseEntity
    {
        public int ProjectId { get; set; }
        public int TeamMemberId { get; set; }
        public DateOnly WorkDate { get; set; }

        public virtual Project Project { get; set; }
        public virtual TeamMember TeamMember { get; set; }
        public virtual ICollection<TimesheetEntry> Entries { get; set; } = new List<TimesheetEntry>();
    }
}
