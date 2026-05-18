namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class ServiceRequestTeam : BaseEntity
    {
        public int ServiceRequestId { get; set; }
        public int TeamMemberId { get; set; }
        public DateTime AssignedDate { get; set; }
        public string Role { get; set; } // Role in the request (e.g., Lead, Developer, QA)
        public decimal? HourlyRate { get; set; }
        public int? EstimatedHours { get; set; }

        // Navigation Properties
        public virtual ServiceRequest ServiceRequest { get; set; }
        public virtual TeamMember TeamMember { get; set; }
    }
}
