using OffsureManagementSystem.Application.Common.Requests;
using OffsureManagementSystem.Domain.Entities.Enum;

namespace OffsureManagementSystem.Application.DTOs.ClientManagementDTOs
{
    public class ClientFilterRequest : BaseApiRequest
    {
        public int? UserId { get; set; }
        public bool? IsActive { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
    }

    public class UpdateClientProfileDto
    {
        public string CompanyName { get; set; } = string.Empty;
        public string? ContactPersonPhone { get; set; }
        public string? CompanyAddress { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
        public string? PostalCode { get; set; }
        public string? Website { get; set; }
        public string? Description { get; set; }
    }

    public class ClientDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsUserActive { get; set; }
        public bool IsEmailVerified { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string ContactPersonPhone { get; set; } = string.Empty;
        public string CompanyAddress { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public string Website { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int RequestsCount { get; set; }
        public int ProjectsCount { get; set; }
        public List<ClientServiceRequestSummaryDto> ServiceRequests { get; set; } = new();
    }

    public class ClientServiceRequestSummaryDto
    {
        public int Id { get; set; }
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public ServiceRequestStatus Status { get; set; }
        public DateTime RequestedDate { get; set; }
        public int? ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public ProjectStatus? ProjectStatus { get; set; }
    }
}
