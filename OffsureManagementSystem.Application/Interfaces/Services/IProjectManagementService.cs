using OffsureManagementSystem.Application.DTOs.ProjectManagementDTOs;
using OffsureManagementSystem.Domain.Entities.Enum;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IProjectManagementService
    {
        Task<PagedResponse<ProjectDto>> GetAllProjectsAsync(ProjectFilterRequest request);
        Task<PagedResponse<ProjectDto>> GetClientProjectsByUserIdAsync(int userId, ProjectFilterRequest request);
        Task<ProjectDto> GetProjectByIdAsync(int id);
        Task<ProjectDto> GetClientProjectByIdAsync(int userId, int projectId);
        Task<ProjectDto> CreateProjectAsync(CreateProjectDto dto);
        Task<ProjectDto> UpdateProjectAsync(int id, UpdateProjectDto dto);
        Task DeleteProjectAsync(int projectId, int deletedByUserId);
        Task<ProjectDto> AssignTeamMemberAsync(int projectId, AssignProjectTeamMemberDto dto);
        Task<ProjectDto> RemoveTeamMemberAsync(int projectId, int teamMemberId);
        Task<ProjectDto> RemoveAssignmentAsync(int projectId, int assignmentId);
        Task<ProjectDto> UpdateProjectStatusAsync(int projectId, ProjectStatus status);
        Task<PagedResponse<ProjectDto>> GetTeamMemberProjectsByUserIdAsync(int userId, ProjectFilterRequest request);
        Task<ProjectDto> GetTeamMemberProjectByIdAsync(int userId, int projectId);
        Task<PagedResponse<ProjectDto>> GetResourceManagerProjectsByUserIdAsync(int userId, ProjectFilterRequest request);
        Task<ProjectDto> GetResourceManagerProjectByIdAsync(int userId, int projectId);
        Task<ProjectDto> AssignTeamMemberForResourceManagerAsync(int userId, int projectId, AssignProjectTeamMemberDto dto);
        Task<ProjectDto> RemoveAssignmentForResourceManagerAsync(int userId, int projectId, int assignmentId);
        Task<ProjectDto> UpdateProjectDeliveryForResourceManagerAsync(int userId, int projectId, UpdateProjectDeliveryDto dto);
        Task<ProjectDto> UpdateProjectStaffingModeForResourceManagerAsync(int userId, int projectId, UpdateProjectStaffingModeDto dto);
        Task<ProjectDto> UpdateProjectRequiredSkillsForResourceManagerAsync(int userId, int projectId, UpdateProjectRequiredSkillsDto dto);
        Task<ProjectDto> UpdateProjectMilestoneStatusForResourceManagerAsync(int userId, int projectId, int milestoneId, UpdateProjectMilestoneStatusDto dto);
        Task<ProjectDto> UpdateProjectHourlyCostRateForResourceManagerAsync(int userId, int projectId, UpdateProjectRmHourlyCostRateDto dto);
        Task<ProjectDto> SetProjectResourceManagersAsync(int projectId, SetProjectResourceManagersDto dto);
        Task<ProjectDto> UpsertProjectMilestonesAsync(int projectId, UpsertProjectMilestonesDto dto);
        Task<ProjectDto> UpdateProjectMilestoneStatusAsync(int projectId, int milestoneId, UpdateProjectMilestoneStatusDto dto);
        Task<ProjectDto> UpdateProjectSalesAssignmentAsync(int projectId, UpdateProjectSalesAssignmentDto dto);
        Task<PagedResponse<SalesProjectSummaryDto>> GetSalesProjectsByUserIdAsync(int userId, ProjectFilterRequest request);
        Task<SalesProjectSummaryDto> GetSalesProjectByIdAsync(int userId, int projectId);
    }
}
