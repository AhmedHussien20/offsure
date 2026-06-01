using OffsureManagementSystem.Application.Common.Requests;
using OffsureManagementSystem.Domain.Entities.Enum;

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

    public class PublicServiceFilterRequest : BaseApiRequest
    {
        public int? ServiceCategoryId { get; set; }
    }

    public class ServiceRequestFilterRequest : BaseApiRequest
    {
        public ServiceRequestStatus? Status { get; set; }
        public int? ClientId { get; set; }
        public int? ServiceId { get; set; }
    }

    public class CreateServiceCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateServiceCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ServiceCategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int ServicesCount { get; set; }
    }

    public class CreateServiceDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int ServiceCategoryId { get; set; }
        public bool IsVisible { get; set; } = true;
    }

    public class UpdateServiceDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int ServiceCategoryId { get; set; }
        public bool IsVisible { get; set; } = true;
    }

    public class ServiceDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int ServiceCategoryId { get; set; }
        public string ServiceCategoryName { get; set; } = string.Empty;
        public bool IsVisible { get; set; }
    }

    public class UpdateServiceVisibilityDto
    {
        public bool IsVisible { get; set; }
    }

    public class CreateServiceRequestDto
    {
        public int ServiceId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal? Budget { get; set; }
        public int? Priority { get; set; }
    }

    public class UpdateServiceRequestStatusDto
    {
        public ServiceRequestStatus Status { get; set; }
    }

    public class ServiceRequestDto
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string ClientEmail { get; set; } = string.Empty;
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string ServiceCategoryName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public ServiceRequestStatus Status { get; set; }
        public DateTime RequestedDate { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal? Budget { get; set; }
        public int? Priority { get; set; }
        public int? ProjectId { get; set; }
        public ProjectStatus? ProjectStatus { get; set; }
    }
}
