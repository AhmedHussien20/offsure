using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.TeamManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using System.Security.Claims;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/team-members")]
    [ApiController]
    [Authorize(Roles = "TeamMember")]
    public class TeamMemberPortalController : BaseController
    {
        private readonly ITeamManagementService _teamManagementService;

        public TeamMemberPortalController(ITeamManagementService teamManagementService)
        {
            _teamManagementService = teamManagementService;
        }

        [HttpGet("profile")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> GetProfile()
        {
            var member = await _teamManagementService.GetTeamMemberProfileAsync(GetCurrentUserId());
            return Ok(ApiResponse<TeamMemberDto>.Ok(member));
        }

        [HttpPut("profile")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> UpdateProfile(UpdateTeamMemberProfileDto dto)
        {
            var member = await _teamManagementService.UpdateTeamMemberProfileAsync(GetCurrentUserId(), dto);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Profile updated successfully."));
        }

        [HttpPatch("profile/availability")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> UpdateAvailability(
            UpdateTeamMemberAvailabilityDto dto)
        {
            var member = await _teamManagementService.UpdateAvailabilityAsync(GetCurrentUserId(), dto.IsAvailable);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Availability updated successfully."));
        }

        [HttpPost("profile/skills")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> AssignSkill(UpsertTeamMemberSkillDto dto)
        {
            var member = await _teamManagementService.AssignSkillForUserAsync(GetCurrentUserId(), dto);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Skill saved successfully."));
        }

        [HttpDelete("profile/skills/{skillId:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> RemoveSkill(int skillId)
        {
            var member = await _teamManagementService.RemoveSkillForUserAsync(GetCurrentUserId(), skillId);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Skill removed successfully."));
        }

        [HttpPost("profile/cv/generate")]
        public async Task<ActionResult<ApiResponse<CvStorageResultDto>>> GenerateCv()
        {
            var result = await _teamManagementService.GenerateCvForUserAsync(GetCurrentUserId());
            return Ok(ApiResponse<CvStorageResultDto>.Ok(result, "CV generated successfully."));
        }

        [HttpPost("profile/cv/upload")]
        public async Task<ActionResult<ApiResponse<CvStorageResultDto>>> UploadCv(IFormFile file)
        {
            if (file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            await using var stream = file.OpenReadStream();
            var result = await _teamManagementService.StoreCvForUserAsync(
                GetCurrentUserId(),
                stream,
                file.FileName);

            return Ok(ApiResponse<CvStorageResultDto>.Ok(result, "CV uploaded successfully."));
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
