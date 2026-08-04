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

        [HttpGet("resource-managers/{id:int}")]
        public async Task<ActionResult<ApiResponse<ResourceManagerUserDto>>> GetResourceManagerById(int id)
        {
            var manager = await _teamManagementService.GetResourceManagerByIdAsync(id);
            return Ok(ApiResponse<ResourceManagerUserDto>.Ok(manager));
        }

        [HttpPost("resource-managers")]
        public async Task<ActionResult<ApiResponse<ResourceManagerUserDto>>> CreateResourceManager(
            CreateResourceManagerDto dto)
        {
            var manager = await _teamManagementService.CreateResourceManagerAsync(dto);
            return Ok(ApiResponse<ResourceManagerUserDto>.Ok(manager, "Resource manager created successfully."));
        }

        [HttpPut("resource-managers/{id:int}")]
        public async Task<ActionResult<ApiResponse<ResourceManagerUserDto>>> UpdateResourceManager(
            int id,
            UpdateResourceManagerDto dto)
        {
            var manager = await _teamManagementService.UpdateResourceManagerAsync(id, dto);
            return Ok(ApiResponse<ResourceManagerUserDto>.Ok(manager, "Resource manager updated successfully."));
        }

        [HttpPatch("resource-managers/{id:int}/deactivate")]
        public async Task<ActionResult<ApiResponse<ResourceManagerUserDto>>> DeactivateResourceManager(int id)
        {
            var manager = await _teamManagementService.DeactivateResourceManagerAsync(id);
            return Ok(ApiResponse<ResourceManagerUserDto>.Ok(manager, "Resource manager deactivated successfully."));
        }

        [HttpPatch("resource-managers/{id:int}/activate")]
        public async Task<ActionResult<ApiResponse<ResourceManagerUserDto>>> ActivateResourceManager(int id)
        {
            var manager = await _teamManagementService.ActivateResourceManagerAsync(id);
            return Ok(ApiResponse<ResourceManagerUserDto>.Ok(manager, "Resource manager activated successfully."));
        }

        [HttpDelete("resource-managers/{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteResourceManager(int id)
        {
            await _teamManagementService.DeleteResourceManagerAsync(id);
            return Ok(ApiResponse<object>.Ok(null!, "Resource manager deleted successfully."));
        }

        [HttpPost("resource-managers/{id:int}/reset-password")]
        public async Task<ActionResult<ApiResponse<object>>> ResetResourceManagerPassword(
            int id,
            ResetTeamMemberPasswordDto dto)
        {
            await _teamManagementService.ResetResourceManagerPasswordAsync(id, dto);
            return Ok(ApiResponse<object>.Ok(null!, "Resource manager password reset successfully."));
        }

        [HttpGet("sales-users")]
        public async Task<ActionResult<ApiResponse<PagedResponse<SalesUserDto>>>> GetSalesUsers(
            [FromQuery] SalesUserRequest request)
        {
            var users = await _teamManagementService.GetSalesUsersAsync(request);
            return Ok(ApiResponse<PagedResponse<SalesUserDto>>.Ok(users));
        }

        [HttpGet("sales-users/{id:int}")]
        public async Task<ActionResult<ApiResponse<SalesUserDto>>> GetSalesUserById(int id)
        {
            var user = await _teamManagementService.GetSalesUserByIdAsync(id);
            return Ok(ApiResponse<SalesUserDto>.Ok(user));
        }

        [HttpPost("sales-users")]
        public async Task<ActionResult<ApiResponse<SalesUserDto>>> CreateSalesUser(CreateSalesUserDto dto)
        {
            var user = await _teamManagementService.CreateSalesUserAsync(dto);
            return Ok(ApiResponse<SalesUserDto>.Ok(user, "Sales user created successfully."));
        }

        [HttpPut("sales-users/{id:int}")]
        public async Task<ActionResult<ApiResponse<SalesUserDto>>> UpdateSalesUser(int id, UpdateSalesUserDto dto)
        {
            var user = await _teamManagementService.UpdateSalesUserAsync(id, dto);
            return Ok(ApiResponse<SalesUserDto>.Ok(user, "Sales user updated successfully."));
        }

        [HttpPatch("sales-users/{id:int}/deactivate")]
        public async Task<ActionResult<ApiResponse<SalesUserDto>>> DeactivateSalesUser(int id)
        {
            var user = await _teamManagementService.DeactivateSalesUserAsync(id);
            return Ok(ApiResponse<SalesUserDto>.Ok(user, "Sales user deactivated successfully."));
        }

        [HttpPatch("sales-users/{id:int}/activate")]
        public async Task<ActionResult<ApiResponse<SalesUserDto>>> ActivateSalesUser(int id)
        {
            var user = await _teamManagementService.ActivateSalesUserAsync(id);
            return Ok(ApiResponse<SalesUserDto>.Ok(user, "Sales user activated successfully."));
        }

        [HttpDelete("sales-users/{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteSalesUser(int id)
        {
            await _teamManagementService.DeleteSalesUserAsync(id);
            return Ok(ApiResponse<object>.Ok(null!, "Sales user deleted successfully."));
        }

        [HttpPost("sales-users/{id:int}/reset-password")]
        public async Task<ActionResult<ApiResponse<object>>> ResetSalesUserPassword(
            int id,
            ResetTeamMemberPasswordDto dto)
        {
            await _teamManagementService.ResetSalesUserPasswordAsync(id, dto);
            return Ok(ApiResponse<object>.Ok(null!, "Sales user password reset successfully."));
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

        [HttpPatch("{id:int}/deactivate")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> Deactivate(int id)
        {
            var member = await _teamManagementService.DeactivateAsync(id);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Team member deactivated successfully."));
        }

        [HttpPatch("{id:int}/activate")]
        public async Task<ActionResult<ApiResponse<TeamMemberDto>>> Activate(int id)
        {
            var member = await _teamManagementService.ActivateAsync(id);
            return Ok(ApiResponse<TeamMemberDto>.Ok(member, "Team member activated successfully."));
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
