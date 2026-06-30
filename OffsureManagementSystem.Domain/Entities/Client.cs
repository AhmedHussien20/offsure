namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class Client : BaseEntity
    {
        public int UserId { get; set; }
        public string CompanyName { get; set; }
       
        public string ContactPersonPhone { get; set; }
        public string? CompanyAddress { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
        public string? PostalCode { get; set; }
        public bool IsActive { get; set; } = true;
        public int? SalesId { get; set; }

        // Navigation Properties
        public virtual User User { get; set; }
        public virtual User? SalesUser { get; set; }
        public virtual ICollection<ServiceRequest> ServiceRequests { get; set; } = new List<ServiceRequest>();
    }
}
