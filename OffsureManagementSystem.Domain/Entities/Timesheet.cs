namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    /// <summary>
    /// One record per project + owner + calendar day. The owner is either a team member
    /// or a resource manager logging their own time (exactly one of the two ids is set).
    /// </summary>
    public class Timesheet : BaseEntity
    {
        public int ProjectId { get; set; }
        public int? TeamMemberId { get; set; }
        public int? ResourceManagerUserId { get; set; }
        public DateOnly WorkDate { get; set; }

        public virtual Project Project { get; set; }
        public virtual TeamMember? TeamMember { get; set; }
        public virtual User? ResourceManagerUser { get; set; }
        public virtual ICollection<TimesheetEntry> Entries { get; set; } = new List<TimesheetEntry>();
    }
}
