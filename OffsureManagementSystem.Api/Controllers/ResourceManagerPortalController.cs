using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.ProjectManagementDTOs;
using OffsureManagementSystem.Application.DTOs.TeamManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using System.Security.Claims;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/resource-manager")]
    [ApiController]
    [Authorize(Roles = "ResourceManager")]
    public class ResourceManagerPortalController : BaseController
    {
        private readonly ITeamManagementService _teamManagementService;
        private readonly IProjectManagementService _projectManagementService;

        public ResourceManagerPortalController(
            ITeamManagementService teamManagementService,
            IProjectManagementService projectManagementService)
        {
            _teamManagementService = teamManagementService;
            _projectManagementService = projectManagementService;
        }

        [HttpGet("team-members")]
        public async Task<ActionResult<ApiResponse<PagedResponse<TeamMemberDto>>>> GetTeamMembers(
            [FromQuery] TeamMemberRequest request)
        {
            var members = await _teamManagementService.GetManagedTeamMembersAsync(GetCurrentUserId(), request);
            return Ok(ApiResponse<PagedResponse<TeamMemberDto>>.Ok(members));
        }

        [HttpGet("team-members/{id:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> GetTeamMemberById(int id)
        {
            var member = await _teamManagementService.GetManagedTeamMemberByIdAsync(GetCurrentUserId(), id);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member));
        }

        [HttpPost("team-members")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> CreateTeamMember(CreateTeamMemberDto dto)
        {
            var member = await _teamManagementService.CreateManagedTeamMemberAsync(GetCurrentUserId(), dto);
            return CreatedAtAction(
                nameof(GetTeamMemberById),
                new { id = member.Id },
                ApiResponse<TeamMemberDto>.Ok(member, "Team member created successfully."));
        }

        [HttpPut("team-members/{id:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> UpdateTeamMember(
            int id,
            UpdateTeamMemberDto dto)
        {
            var member = await _teamManagementService.UpdateManagedTeamMemberAsync(GetCurrentUserId(), id, dto);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Team member updated successfully."));
        }

        [HttpDelete("team-members/{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteTeamMember(int id)
        {
            await _teamManagementService.DeleteManagedTeamMemberAsync(GetCurrentUserId(), id);
            return Ok(ApiResponse<object>.Ok(null!, "Team member deleted successfully."));
        }

        [HttpPatch("team-members/{id:int}/deactivate")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> DeactivateTeamMember(int id)
        {
            var member = await _teamManagementService.DeactivateManagedTeamMemberAsync(GetCurrentUserId(), id);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Team member deactivated successfully."));
        }

        [HttpPatch("team-members/{id:int}/activate")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> ActivateTeamMember(int id)
        {
            var member = await _teamManagementService.ActivateManagedTeamMemberAsync(GetCurrentUserId(), id);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Team member activated successfully."));
        }

        [HttpPost("team-members/{id:int}/skills")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> AssignSkill(
            int id,
            UpsertTeamMemberSkillDto dto)
        {
            var member = await _teamManagementService.AssignSkillForResourceManagerAsync(GetCurrentUserId(), id, dto);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Team member skill saved successfully."));
        }

        [HttpDelete("team-members/{id:int}/skills/{skillId:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> RemoveSkill(int id, int skillId)
        {
            var member = await _teamManagementService.RemoveSkillForResourceManagerAsync(GetCurrentUserId(), id, skillId);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Team member skill removed successfully."));
        }

        [HttpPost("team-members/{id:int}/reset-password")]
        public async Task<ActionResult<ApiResponse<object>>> ResetTeamMemberPassword(int id, ResetTeamMemberPasswordDto dto)
        {
            await _teamManagementService.ResetManagedTeamMemberPasswordAsync(GetCurrentUserId(), id, dto);
            return Ok(ApiResponse<object>.Ok(null!, "Team member password reset successfully."));
        }

        [HttpDelete("projects/{id:int}/assignments/{assignmentId:int}")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> RemoveAssignment(int id, int assignmentId)
        {
            var project = await _projectManagementService.RemoveAssignmentForResourceManagerAsync(
                GetCurrentUserId(),
                id,
                assignmentId);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Team member unassigned successfully."));
        }

        [HttpGet("projects")]
        public async Task<ActionResult<ApiResponse<PagedResponse<ProjectDto>>>> GetProjects(
            [FromQuery] ProjectFilterRequest request)
        {
            var projects = await _projectManagementService.GetResourceManagerProjectsByUserIdAsync(
                GetCurrentUserId(),
                request);
            return Ok(ApiResponse<PagedResponse<ProjectDto>>.Ok(projects));
        }

        [HttpGet("projects/{id:int}")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> GetProjectById(int id)
        {
            var project = await _projectManagementService.GetResourceManagerProjectByIdAsync(GetCurrentUserId(), id);
            return Ok(ApiResponse<ProjectDto>.Ok(project));
        }

        [HttpPost("projects/{id:int}/team-members")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> AssignTeamMember(
            int id,
            AssignProjectTeamMemberDto dto)
        {
            var project = await _projectManagementService.AssignTeamMemberForResourceManagerAsync(
                GetCurrentUserId(),
                id,
                dto);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Team member assigned successfully."));
        }

        [HttpPatch("projects/{id:int}/delivery")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateDelivery(
            int id,
            UpdateProjectDeliveryDto dto)
        {
            var project = await _projectManagementService.UpdateProjectDeliveryForResourceManagerAsync(
                GetCurrentUserId(),
                id,
                dto);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Project delivery updated successfully."));
        }

        [HttpPatch("projects/{id:int}/staffing-mode")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateStaffingMode(
            int id,
            UpdateProjectStaffingModeDto dto)
        {
            var project = await _projectManagementService.UpdateProjectStaffingModeForResourceManagerAsync(
                GetCurrentUserId(),
                id,
                dto);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Staffing mode updated successfully."));
        }

        [HttpPut("projects/{id:int}/required-skills")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateRequiredSkills(
            int id,
            UpdateProjectRequiredSkillsDto dto)
        {
            var project = await _projectManagementService.UpdateProjectRequiredSkillsForResourceManagerAsync(
                GetCurrentUserId(),
                id,
                dto);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Required skills updated successfully."));
        }

        [HttpPatch("projects/{id:int}/milestones/{milestoneId:int}/status")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateMilestoneStatus(
            int id,
            int milestoneId,
            UpdateProjectMilestoneStatusDto dto)
        {
            var project = await _projectManagementService.UpdateProjectMilestoneStatusForResourceManagerAsync(
                GetCurrentUserId(),
                id,
                milestoneId,
                dto);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Milestone status updated successfully."));
        }

        [HttpPatch("projects/{id:int}/hourly-cost-rate")]
        public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateHourlyCostRate(
            int id,
            UpdateProjectRmHourlyCostRateDto dto)
        {
            var project = await _projectManagementService.UpdateProjectHourlyCostRateForResourceManagerAsync(
                GetCurrentUserId(),
                id,
                dto);
            return Ok(ApiResponse<ProjectDto>.Ok(project, "Cost rate saved successfully."));
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
