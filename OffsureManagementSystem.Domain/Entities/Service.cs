namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;
    using OffsureManagementSystem.Domain.Entities;

    public class Service : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public int ServiceCategoryId { get; set; }
        public bool IsVisible { get; set; } = true;

        // Navigation Properties
        public virtual ICollection<ServiceRequest> ServiceRequests { get; set; } = new List<ServiceRequest>();
        public virtual ICollection<PortfolioProject> PortfolioProjects { get; set; } = new List<PortfolioProject>();
        public virtual ServiceCategory ServiceCategory { get; set; }

    }
}
