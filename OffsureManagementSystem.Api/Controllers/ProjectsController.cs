using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.ProjectManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/projects")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class ProjectsController : BaseController
    {
        private readonly IProjectManagementService _projectManagementService;

        public ProjectsController(IProjectManagementService projectManagementService)
        {
            _projectManagementService = projectManagementService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResponse<ProjectDto>>>> GetAllProjects(
            [FromQuery] ProjectFilterRequest request)
        {
            var projects = await _projectManagementService.GetAllProjectsAsync(request);
            return Ok(ApiResponse<PagedResponse<ProjectDto>>.Ok(projects));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> GetProjectById(int id)
        {
            var project = await _projectManagementService.GetProjectByIdAsync(id);
            return Ok(ApiResponse<ProjectDto>.Ok(project));
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> CreateProject(CreateProjectDto dto)
        {
            var project = await _projectManagementService.CreateProjectAsync(dto);
            return CreatedAtAction(
                nameof(GetProjectById),
                new { id = project.Id },
                ApiResponse<ProjectDto>.Ok(project, "Project created successfully."));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateProject(int id, UpdateProjectDto dto)
        {
            var project = await _projectManagementService.UpdateProjectAsync(id, dto);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Project updated successfully."));
        }

        [HttpPost("{id:int}/team-members")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> AssignTeamMember(
            int id,
            AssignProjectTeamMemberDto dto)
        {
            var project = await _projectManagementService.AssignTeamMemberAsync(id, dto);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Team member assigned successfully."));
        }

        [HttpDelete("{id:int}/team-members/{teamMemberId:int}")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> RemoveTeamMember(int id, int teamMemberId)
        {
            var project = await _projectManagementService.RemoveTeamMemberAsync(id, teamMemberId);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Team member removed successfully."));
        }

        [HttpPatch("{id:int}/status")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateProjectStatus(
            int id,
            UpdateProjectStatusDto dto)
        {
            var project = await _projectManagementService.UpdateProjectStatusAsync(id, dto.Status);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Project status updated successfully."));
        }
    }
}
