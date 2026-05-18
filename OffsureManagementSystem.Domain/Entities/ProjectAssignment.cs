namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class ProjectAssignment : BaseEntity
    {
        public int ProjectId { get; set; }
        public int TeamMemberId { get; set; }
        public string Role { get; set; } // Role in the project (e.g., Lead, Developer, QA)
        public DateTime AssignedDate { get; set; }
        public DateTime? UnassignedDate { get; set; }
        public decimal? HourlyRate { get; set; }
        public int? AllocatedHours { get; set; }

        // Navigation Properties
        public virtual Project Project { get; set; }
        public virtual TeamMember TeamMember { get; set; }
    }
}
