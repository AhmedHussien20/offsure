namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class PortfolioProjectImage : BaseEntity
    {
        public int PortfolioProjectId { get; set; }
        public string ImageUrl { get; set; }
        public string ImageAltText { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;

        // Navigation Properties
        public virtual PortfolioProject PortfolioProject { get; set; }
    }
}
