using OffsureManagementSystem.Application.Common.Requests;
using OffsureManagementSystem.Domain.Entities.Enum;

namespace OffsureManagementSystem.Application.DTOs.ProjectManagementDTOs
{
    public class ProjectFilterRequest : BaseApiRequest
    {
        public ProjectStatus? Status { get; set; }
        public int? ServiceRequestId { get; set; }
        public int? ClientId { get; set; }
        public int? ServiceId { get; set; }
        public int? TeamMemberId { get; set; }
    }

    public class CreateProjectDto
    {
        public int ServiceRequestId { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public DateTime? TargetEndDate { get; set; }
        public decimal? Budget { get; set; }
    }

    public class UpdateProjectDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime? TargetEndDate { get; set; }
        public decimal? Budget { get; set; }
        public int? Progress { get; set; }
    }

    public class AssignProjectTeamMemberDto
    {
        public int TeamMemberId { get; set; }
        public string Role { get; set; } = string.Empty;
        public decimal? HourlyRate { get; set; }
        public int? AllocatedHours { get; set; }
    }

    public class UpdateProjectStatusDto
    {
        public ProjectStatus Status { get; set; }
    }

    public class ProjectDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int? ServiceRequestId { get; set; }
        public string ServiceRequestTitle { get; set; } = string.Empty;
        public int? ClientId { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public int? ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public ProjectStatus Status { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? TargetEndDate { get; set; }
        public decimal? Budget { get; set; }
        public int? Progress { get; set; }
        public List<ProjectAssignmentDto> TeamMembers { get; set; } = new();
    }

    public class ProjectAssignmentDto
    {
        public int Id { get; set; }
        public int TeamMemberId { get; set; }
        public string TeamMemberName { get; set; } = string.Empty;
        public string TeamMemberTitle { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime AssignedDate { get; set; }
        public decimal? HourlyRate { get; set; }
        public int? AllocatedHours { get; set; }
    }
}
