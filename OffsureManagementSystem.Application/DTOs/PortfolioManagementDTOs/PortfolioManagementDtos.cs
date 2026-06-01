using OffsureManagementSystem.Application.Common.Requests;

namespace OffsureManagementSystem.Application.DTOs.PortfolioManagementDTOs
{
    public class PortfolioFilterRequest : BaseApiRequest
    {
        public int? ServiceId { get; set; }
        public DateTime? CompletedFrom { get; set; }
        public DateTime? CompletedTo { get; set; }
        /// <summary>When true, returns draft and published items (admin). Public callers should leave false.</summary>
        public bool IncludeUnpublished { get; set; }
    }

    public class AddPortfolioDto
    {
        public int ServiceId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string? ThumbnailUrl { get; set; }
        public DateTime CompletedDate { get; set; }
        public decimal? ProjectValue { get; set; }
        public bool IsPublished { get; set; } = true;
        public List<AddPortfolioImageDto> Images { get; set; } = new();
    }

    public class UpdatePortfolioDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string? ThumbnailUrl { get; set; }
        public DateTime CompletedDate { get; set; }
        public decimal? ProjectValue { get; set; }
        public bool IsPublished { get; set; } = true;
    }

    public class AddPortfolioImageDto
    {
        public string ImageUrl { get; set; } = string.Empty;
        public string? ImageAltText { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class LinkPortfolioToServiceDto
    {
        public int ServiceId { get; set; }
    }

    public class PortfolioDto
    {
        public int Id { get; set; }
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string ServiceCategoryName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public string ThumbnailUrl { get; set; } = string.Empty;
        public DateTime CompletedDate { get; set; }
        public decimal? ProjectValue { get; set; }
        public bool IsPublished { get; set; }
        public List<PortfolioImageDto> Images { get; set; } = new();
    }

    public class PortfolioImageDto
    {
        public int Id { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public string ImageAltText { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
    }
}
