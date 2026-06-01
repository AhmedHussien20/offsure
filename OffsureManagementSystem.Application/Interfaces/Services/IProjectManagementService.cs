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
        Task<ProjectDto> AssignTeamMemberAsync(int projectId, AssignProjectTeamMemberDto dto);
        Task<ProjectDto> RemoveTeamMemberAsync(int projectId, int teamMemberId);
        Task<ProjectDto> UpdateProjectStatusAsync(int projectId, ProjectStatus status);
    }
}
