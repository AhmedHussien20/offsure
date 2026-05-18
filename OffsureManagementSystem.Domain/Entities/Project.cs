namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;
    using OffsureManagementSystem.Domain.Entities.Enum;

    public class Project : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public int? ServiceRequestId { get; set; }
        public ProjectStatus Status { get; set; } = ProjectStatus.Pending;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? TargetEndDate { get; set; }
        public decimal? Budget { get; set; }
        public int? Progress { get; set; } // 0-100

        // Navigation Properties
        public virtual ServiceRequest ServiceRequest { get; set; }
        public virtual ICollection<ProjectAssignment> ProjectAssignments { get; set; } = new List<ProjectAssignment>();
    }
}
