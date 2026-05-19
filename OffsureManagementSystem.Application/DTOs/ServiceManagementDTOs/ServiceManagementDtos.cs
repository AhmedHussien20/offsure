using OffsureManagementSystem.Application.Common.Requests;

namespace OffsureManagementSystem.Application.DTOs.ServiceManagementDTOs
{
    public class ServiceCategoryRequest : BaseApiRequest
    {
        public bool? IsActive { get; set; }
    }

    public class ServiceFilterRequest : BaseApiRequest
    {
        public int? ServiceCategoryId { get; set; }
        public bool? IsVisible { get; set; }
    }

    public class CreateServiceCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? IconUrl { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateServiceCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? IconUrl { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ServiceCategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string IconUrl { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public int ServicesCount { get; set; }
    }

    public class CreateServiceDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int ServiceCategoryId { get; set; }
        public string? IconUrl { get; set; }
        public bool IsVisible { get; set; } = true;
    }

    public class UpdateServiceDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int ServiceCategoryId { get; set; }
        public string? IconUrl { get; set; }
        public bool IsVisible { get; set; } = true;
    }

    public class ServiceDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int ServiceCategoryId { get; set; }
        public string ServiceCategoryName { get; set; } = string.Empty;
        public string IconUrl { get; set; } = string.Empty;
        public bool IsVisible { get; set; }
    }

    public class UpdateServiceVisibilityDto
    {
        public bool IsVisible { get; set; }
    }
}
