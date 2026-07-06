using OffsureManagementSystem.Application.Common.Requests;
using OffsureManagementSystem.Domain.Entities.Enum;

namespace OffsureManagementSystem.Application.DTOs.ProjectManagementDTOs
{
    public class ProjectFilterRequest : BaseApiRequest
    {
        public ProjectStatus? Status { get; set; }
        public ProjectBudgetType? BudgetType { get; set; }
        public int? ServiceRequestId { get; set; }
        public int? ClientId { get; set; }
        public int? ServiceId { get; set; }
        public int? TeamMemberId { get; set; }
        public int? SalesId { get; set; }
    }

    public class CreateProjectDto
    {
        /// <summary>When &gt; 0, converts an accepted request. When 0, creates a standalone project (no service request).</summary>
        public int ServiceRequestId { get; set; }
        public int? ClientId { get; set; }
        public int? ServiceId { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? TargetEndDate { get; set; }
        public decimal? Budget { get; set; }
        public ProjectBudgetType BudgetType { get; set; } = ProjectBudgetType.Total;
        public decimal? HourlyRate { get; set; }
        public int? ExpectedHours { get; set; }
        public List<int>? RequiredSkillIds { get; set; }
        public bool UsesMilestones { get; set; }
        public int? MilestoneCount { get; set; }
        public List<UpsertProjectMilestoneItemDto>? Milestones { get; set; }
        public int? SalesId { get; set; }
        public CommissionType? CommissionType { get; set; }
        public decimal? CommissionValue { get; set; }
    }

    public class UpdateProjectDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime? TargetEndDate { get; set; }
        public decimal? Budget { get; set; }
        public ProjectBudgetType? BudgetType { get; set; }
        public decimal? HourlyRate { get; set; }
        public int? ExpectedHours { get; set; }
        public int? Progress { get; set; }
        /// <summary>When set, syncs selected skills on the project (ProjectSkills table).</summary>
        public List<int>? RequiredSkillIds { get; set; }
        public bool? AssignTeamBySkill { get; set; }
    }

    public class UpdateProjectStaffingModeDto
    {
        public bool AssignTeamBySkill { get; set; }
    }

    public class UpdateProjectRequiredSkillsDto
    {
        public List<int> RequiredSkillIds { get; set; } = new();
    }

    public class AssignProjectTeamMemberDto
    {
        public int TeamMemberId { get; set; }
        public string Role { get; set; } = string.Empty;
        public int? SkillId { get; set; }
        public decimal? HourlyRate { get; set; }
        public int? AllocatedHours { get; set; }
    }

    public class UpdateProjectStatusDto
    {
        public ProjectStatus Status { get; set; }
    }

    public class UpdateProjectDeliveryDto
    {
        public ProjectStatus Status { get; set; }
        public int Progress { get; set; }
    }

    public class SetProjectResourceManagersDto
    {
        public List<int> ResourceManagerUserIds { get; set; } = new();
    }

    public class UpdateProjectRmHourlyCostRateDto
    {
        public decimal HourlyCostRate { get; set; }
    }

    public class UpdateProjectSalesAssignmentDto
    {
        public int? SalesId { get; set; }
        public CommissionType? CommissionType { get; set; }
        public decimal? CommissionValue { get; set; }
    }

    public class ProjectResourceManagerDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public decimal? HourlyCostRate { get; set; }
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
        public ProjectBudgetType BudgetType { get; set; }
        public decimal? HourlyRate { get; set; }
        public int? ExpectedHours { get; set; }
        public int? Progress { get; set; }
        public List<int> RequiredSkillIds { get; set; } = new();
        public List<ProjectResourceManagerDto> ResourceManagers { get; set; } = new();
        public List<ProjectAssignmentDto> TeamMembers { get; set; } = new();
        public bool UsesMilestones { get; set; }
        public int? MilestoneCount { get; set; }
        public bool AssignTeamBySkill { get; set; }
        public List<ProjectMilestoneDto> Milestones { get; set; } = new();
        /// <summary>Current RM's cost rate on this hourly project (resource manager portal only).</summary>
        public decimal? MyHourlyCostRate { get; set; }
        /// <summary>Current team member's role on this project (team member portal list).</summary>
        public string MyRole { get; set; } = string.Empty;
        public int? SalesId { get; set; }
        public string SalesPersonName { get; set; } = string.Empty;
        public CommissionType? CommissionType { get; set; }
        public decimal? CommissionValue { get; set; }
        public decimal? CalculatedCommissionAmount { get; set; }
    }

    public class SalesProjectSummaryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public ProjectStatus Status { get; set; }
        public List<string> TeamMemberNames { get; set; } = new();
        public CommissionType? CommissionType { get; set; }
        public decimal? CommissionValue { get; set; }
        public decimal? CalculatedCommissionAmount { get; set; }
    }

    public class ProjectAssignmentDto
    {
        public int Id { get; set; }
        public int TeamMemberId { get; set; }
        public int? ResourceManagerId { get; set; }
        public string TeamMemberName { get; set; } = string.Empty;
        public string TeamMemberTitle { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public int? SkillId { get; set; }
        public DateTime AssignedDate { get; set; }
        public decimal? HourlyRate { get; set; }
        public int? AllocatedHours { get; set; }
    }

    public class ProjectMilestoneDto
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Order { get; set; }
        public decimal PaymentPercentage { get; set; }
        public decimal PaymentAmount { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public MilestoneStatus Status { get; set; }
    }

    public class UpsertProjectMilestoneItemDto
    {
        public int? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Order { get; set; }
        public decimal PaymentPercentage { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class UpsertProjectMilestonesDto
    {
        public List<UpsertProjectMilestoneItemDto> Milestones { get; set; } = new();
    }

    public class UpdateProjectMilestoneStatusDto
    {
        public MilestoneStatus Status { get; set; }
    }
}
