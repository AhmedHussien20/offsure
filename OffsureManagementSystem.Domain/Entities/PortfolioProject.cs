namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class PortfolioProject : BaseEntity
    {
        public int ServiceId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string ClientName { get; set; }
        public string ThumbnailUrl { get; set; }
        public DateTime CompletedDate { get; set; }
        public decimal? ProjectValue { get; set; }
        public bool IsPublished { get; set; } = true;

        // Navigation Properties
        public virtual Service Service { get; set; }
        public virtual ICollection<PortfolioProjectImage> PortfolioProjectImages { get; set; } = new List<PortfolioProjectImage>();
    }
}
