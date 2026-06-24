using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.TeamManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/team-members")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class TeamMembersController : BaseController
    {
        private readonly ITeamManagementService _teamManagementService;

        public TeamMembersController(ITeamManagementService teamManagementService)
        {
            _teamManagementService = teamManagementService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResponse<TeamMemberDto>>>> GetAll(
            [FromQuery] TeamMemberRequest request)
        {
            var members = await _teamManagementService.GetAllAsync(request);
            return Ok(ApiResponse<PagedResponse<TeamMemberDto>>.Ok(members));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> GetById(int id)
        {
            var member = await _teamManagementService.GetByIdAsync(id);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member));
        }

        [HttpGet("structure")]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<TeamStructureDto>>>> GetStructure()
        {
            var structure = await _teamManagementService.GetTeamStructureAsync();
            return Ok(ApiResponse<IReadOnlyList<TeamStructureDto>>.Ok(structure));
        }

        [HttpGet("resource-managers")]
        public async Task<ActionResult<ApiResponse<PagedResponse<ResourceManagerUserDto>>>> GetResourceManagers(
            [FromQuery] ResourceManagerRequest request)
        {
            var managers = await _teamManagementService.GetResourceManagersAsync(request);
            return Ok(ApiResponse<PagedResponse<ResourceManagerUserDto>>.Ok(managers));
        }

        [HttpPost("resource-managers")]
        public async Task<ActionResult<ApiResponse<ResourceManagerUserDto>>> CreateResourceManager(
            CreateResourceManagerDto dto)
        {
            var manager = await _teamManagementService.CreateResourceManagerAsync(dto);
            return Ok(ApiResponse<ResourceManagerUserDto>.Ok(manager, "Resource manager created successfully."));
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> Create(CreateTeamMemberDto dto)
        {
            var member = await _teamManagementService.CreateAsync(dto);
            return CreatedAtAction(
                nameof(GetById),
                new { id = member.Id },
                ApiResponse<TeamMemberDto>.Ok(member, "Team member created successfully."));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> Update(int id, UpdateTeamMemberDto dto)
        {
            var member = await _teamManagementService.UpdateAsync(id, dto);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Team member updated successfully."));
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            await _teamManagementService.DeleteAsync(id);
            return Ok(ApiResponse<object>.Ok(null!, "Team member deleted successfully."));
        }

        [HttpPost("{id:int}/skills")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> AssignSkill(
            int id,
            UpsertTeamMemberSkillDto dto)
        {
            var member = await _teamManagementService.AssignSkillAsync(id, dto);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Team member skill saved successfully."));
        }

        [HttpDelete("{id:int}/skills/{skillId:int}")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> RemoveSkill(int id, int skillId)
        {
            var member = await _teamManagementService.RemoveSkillAsync(id, skillId);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Team member skill removed successfully."));
        }

        [HttpPost("{id:int}/cv/upload")]
        public async Task<ActionResult<ApiResponse<CvStorageResultDto>>> UploadCv(int id, IFormFile file)
        {
            if (file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            await using var stream = file.OpenReadStream();
            var result = await _teamManagementService.StoreCvAsync(id, stream, file.FileName);

            return Ok(ApiResponse<CvStorageResultDto>.Ok(result, "Team member CV stored successfully."));
        }

        [HttpPost("{id:int}/reset-password")]
        public async Task<ActionResult<ApiResponse<object>>> ResetPassword(int id, ResetTeamMemberPasswordDto dto)
        {
            await _teamManagementService.ResetTeamMemberPasswordAsync(id, dto);
            return Ok(ApiResponse<object>.Ok(null!, "Team member password reset successfully."));
        }
    }
}
