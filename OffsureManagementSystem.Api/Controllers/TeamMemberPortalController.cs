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

        [HttpPost("profile/cv/upload")]
        public async Task<ActionResult<ApiResponse<CvStorageResultDto>>> UploadCv(IFormFile file)
        {
            if (file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(ApiResponse<object>.Fail("CV must be 5MB or smaller."));

            await using var stream = file.OpenReadStream();
            var result = await _teamManagementService.StoreCvForUserAsync(
                GetCurrentUserId(),
                stream,
                file.FileName);

            return Ok(ApiResponse<CvStorageResultDto>.Ok(result, "CV uploaded successfully."));
        }

        [HttpGet("profile/cv/download")]
        public async Task<IActionResult> DownloadCv()
        {
            var file = await _teamManagementService.OpenCvForUserAsync(GetCurrentUserId());
            if (file is null)
                return NotFound(ApiResponse<object>.Fail("CV not found."));

            return File(file.Value.Stream, file.Value.ContentType, file.Value.FileName);
        }

        [HttpDelete("profile/cv")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteCv()
        {
            await _teamManagementService.DeleteCvForUserAsync(GetCurrentUserId());
            return Ok(ApiResponse<object>.Ok(null, "CV removed successfully."));
        }

        [HttpPost("profile/photo")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> UploadProfilePhoto(IFormFile file)
        {
            if (file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            if (file.Length > 2 * 1024 * 1024)
                return BadRequest(ApiResponse<object>.Fail("Profile photo must be 2MB or smaller."));

            await using var stream = file.OpenReadStream();
            var member = await _teamManagementService.StoreProfilePhotoForUserAsync(
                GetCurrentUserId(),
                stream,
                file.FileName);

            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Profile photo updated."));
        }

        [HttpGet("profile/intro-video/settings")]
        public ActionResult<ApiResponse<IntroVideoSettingsDto>> GetIntroVideoSettings()
        {
            var settings = _teamManagementService.GetIntroVideoSettings();
            return Ok(ApiResponse<IntroVideoSettingsDto>.Ok(settings));
        }

        [HttpPost("profile/intro-video")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> UploadIntroVideo(IFormFile file)
        {
            if (file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            var settings = _teamManagementService.GetIntroVideoSettings();
            var maxBytes = settings.MaxFileSizeMb * 1024L * 1024L;
            if (file.Length > maxBytes)
                return BadRequest(ApiResponse<object>.Fail($"Intro video must be {settings.MaxFileSizeMb}MB or smaller."));

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension is not (".mp4" or ".webm" or ".mov"))
                return BadRequest(ApiResponse<object>.Fail("Intro video must be MP4, WEBM, or MOV."));

            await using var stream = file.OpenReadStream();
            var member = await _teamManagementService.StoreIntroVideoForUserAsync(
                GetCurrentUserId(),
                stream,
                file.FileName);

            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Introduction video saved."));
        }

        [HttpDelete("profile/intro-video")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> DeleteIntroVideo()
        {
            await _teamManagementService.DeleteIntroVideoForUserAsync(GetCurrentUserId());
            var member = await _teamManagementService.GetTeamMemberProfileAsync(GetCurrentUserId());
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Introduction video removed."));
        }

        [HttpPost("profile/certificates")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> AddCertificate(UpsertTeamMemberCertificateDto dto)
        {
            var member = await _teamManagementService.AddCertificateForUserAsync(GetCurrentUserId(), dto);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Certificate added."));
        }

        [HttpPut("profile/certificates/{certificateId:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> UpdateCertificate(
            int certificateId,
            UpsertTeamMemberCertificateDto dto)
        {
            var member = await _teamManagementService.UpdateCertificateForUserAsync(
                GetCurrentUserId(),
                certificateId,
                dto);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Certificate updated."));
        }

        [HttpDelete("profile/certificates/{certificateId:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> DeleteCertificate(int certificateId)
        {
            var member = await _teamManagementService.DeleteCertificateForUserAsync(GetCurrentUserId(), certificateId);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Certificate removed."));
        }

        [HttpPost("profile/experiences")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> AddExperience(UpsertTeamMemberExperienceDto dto)
        {
            var member = await _teamManagementService.AddExperienceForUserAsync(GetCurrentUserId(), dto);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Experience added."));
        }

        [HttpPut("profile/experiences/{experienceId:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> UpdateExperience(
            int experienceId,
            UpsertTeamMemberExperienceDto dto)
        {
            var member = await _teamManagementService.UpdateExperienceForUserAsync(
                GetCurrentUserId(),
                experienceId,
                dto);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Experience updated."));
        }

        [HttpDelete("profile/experiences/{experienceId:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> DeleteExperience(int experienceId)
        {
            var member = await _teamManagementService.DeleteExperienceForUserAsync(GetCurrentUserId(), experienceId);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Experience removed."));
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
