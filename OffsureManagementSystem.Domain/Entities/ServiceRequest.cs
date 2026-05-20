namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;
    using OffsureManagementSystem.Domain.Entities.Enum;

    public class ServiceRequest : BaseEntity
    {
        public int ClientId { get; set; }
        public int ServiceId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public ServiceRequestStatus Status { get; set; } = ServiceRequestStatus.Pending;
        public DateTime RequestedDate { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal? Budget { get; set; }
        public int? Priority { get; set; } // 1-5 for priority level

        // Navigation Properties
        public virtual Client Client { get; set; }
        public virtual Service Service { get; set; }
        public virtual Project Project { get; set; }
    }
}
