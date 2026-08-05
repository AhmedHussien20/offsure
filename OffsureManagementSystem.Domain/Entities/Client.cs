namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;
    using OffsureManagementSystem.Domain.Entities.Enum;

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

        /// <summary>Owner = organization account; Member = user under an Owner.</summary>
        public ClientAccountRole AccountRole { get; set; } = ClientAccountRole.Owner;

        /// <summary>Set for Members; null for Owners. Points to the organization Owner client.</summary>
        public int? ParentClientId { get; set; }

        // Navigation Properties
        public virtual User User { get; set; }
        public virtual User? SalesUser { get; set; }
        public virtual Client? ParentClient { get; set; }
        public virtual ICollection<Client> Members { get; set; } = new List<Client>();
        public virtual ICollection<ServiceRequest> ServiceRequests { get; set; } = new List<ServiceRequest>();
    }
}
