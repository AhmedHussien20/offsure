using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.ProjectManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using System.Security.Claims;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/projects")]
    [ApiController]
    public class ProjectsController : BaseController
    {
        private readonly IProjectManagementService _projectManagementService;

        public ProjectsController(IProjectManagementService projectManagementService)
        {
            _projectManagementService = projectManagementService;
        }

        [HttpGet]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<PagedResponse<ProjectDto>>>> GetAllProjects(
            [FromQuery] ProjectFilterRequest request)
        {
            var projects = await _projectManagementService.GetAllProjectsAsync(request);
            return Ok(ApiResponse<PagedResponse<ProjectDto>>.Ok(projects));
        }

        [HttpGet("my")]
        [Authorize(Roles = "Client")]
        public async Task<ActionResult<ApiResponse<PagedResponse<ProjectDto>>>> GetMyProjects(
            [FromQuery] ProjectFilterRequest request)
        {
            var projects = await _projectManagementService.GetClientProjectsByUserIdAsync(
                GetCurrentUserId(),
                request);
            return Ok(ApiResponse<PagedResponse<ProjectDto>>.Ok(projects));
        }

        [HttpGet("my/{id:int}")]
        [Authorize(Roles = "Client")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> GetMyProjectById(int id)
        {
            var project = await _projectManagementService.GetClientProjectByIdAsync(GetCurrentUserId(), id);
            return Ok(ApiResponse<ProjectDto>.Ok(project));
        }

        [HttpGet("team/my")]
        [Authorize(Roles = "TeamMember")]
        public async Task<ActionResult<ApiResponse<PagedResponse<ProjectDto>>>> GetTeamMemberProjects(
            [FromQuery] ProjectFilterRequest request)
        {
            var projects = await _projectManagementService.GetTeamMemberProjectsByUserIdAsync(
                GetCurrentUserId(),
                request);
            return Ok(ApiResponse<PagedResponse<ProjectDto>>.Ok(projects));
        }

        [HttpGet("team/my/{id:int}")]
        [Authorize(Roles = "TeamMember")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> GetTeamMemberProjectById(int id)
        {
            var project = await _projectManagementService.GetTeamMemberProjectByIdAsync(GetCurrentUserId(), id);
            return Ok(ApiResponse<ProjectDto>.Ok(project));
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> GetProjectById(int id)
        {
            var project = await _projectManagementService.GetProjectByIdAsync(id);
            return Ok(ApiResponse<ProjectDto>.Ok(project));
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> CreateProject(CreateProjectDto dto)
        {
            var project = await _projectManagementService.CreateProjectAsync(dto);
            return CreatedAtAction(
                nameof(GetProjectById),
                new { id = project.Id },
                ApiResponse<ProjectDto>.Ok(project, "Project created successfully."));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateProject(int id, UpdateProjectDto dto)
        {
            var project = await _projectManagementService.UpdateProjectAsync(id, dto);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Project updated successfully."));
        }

        [HttpPost("{id:int}/team-members")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> AssignTeamMember(
            int id,
            AssignProjectTeamMemberDto dto)
        {
            var project = await _projectManagementService.AssignTeamMemberAsync(id, dto);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Team member assigned successfully."));
        }

        [HttpDelete("{id:int}/team-members/{teamMemberId:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> RemoveTeamMember(int id, int teamMemberId)
        {
            var project = await _projectManagementService.RemoveTeamMemberAsync(id, teamMemberId);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Team member removed successfully."));
        }

        [HttpDelete("{id:int}/assignments/{assignmentId:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> RemoveAssignment(int id, int assignmentId)
        {
            var project = await _projectManagementService.RemoveAssignmentAsync(id, assignmentId);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Assignment removed successfully."));
        }

        [HttpPatch("{id:int}/status")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateProjectStatus(
            int id,
            UpdateProjectStatusDto dto)
        {
            var project = await _projectManagementService.UpdateProjectStatusAsync(id, dto.Status);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Project status updated successfully."));
        }

        private int GetCurrentUserId()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
                throw new UnauthorizedAccessException("Invalid user token.");

            return userId;
        }
    }
}
