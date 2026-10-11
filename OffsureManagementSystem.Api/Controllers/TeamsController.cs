using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.TeamCatalogDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/teams")]
    [ApiController]
    [Authorize]
    public class TeamsController : BaseController
    {
        private readonly ITeamCatalogService _teamCatalogService;

        public TeamsController(ITeamCatalogService teamCatalogService)
        {
            _teamCatalogService = teamCatalogService;
        }

        /// <summary>Offshore team folders for the Offshore TechX page (clients and sales).</summary>
        [HttpGet("catalog")]
        [Authorize(Roles = "Administrator,Sales,Client")]
        public async Task<ActionResult<ApiResponse<TeamCatalogDto>>> GetCatalog(
            [FromQuery] TeamCatalogRequest request)
        {
            var catalog = await _teamCatalogService.GetCatalogAsync(request);
            return Ok(ApiResponse<TeamCatalogDto>.Ok(catalog));
        }

        [HttpGet]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<PagedResponse<TeamDto>>>> GetAll([FromQuery] TeamRequest request)
        {
            var teams = await _teamCatalogService.GetTeamsAsync(request);
            return Ok(ApiResponse<PagedResponse<TeamDto>>.Ok(teams));
        }

        [HttpGet("member-options")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<List<TeamMemberOptionDto>>>> GetMemberOptions()
        {
            var options = await _teamCatalogService.GetTeamMemberOptionsAsync();
            return Ok(ApiResponse<List<TeamMemberOptionDto>>.Ok(options));
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<TeamDto>>> GetById(int id)
        {
            var team = await _teamCatalogService.GetTeamByIdAsync(id);
            return Ok(ApiResponse<TeamDto>.Ok(team));
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<TeamDto>>> Create(CreateTeamDto dto)
        {
            var team = await _teamCatalogService.CreateTeamAsync(dto);
            return CreatedAtAction(
                nameof(GetById),
                new { id = team.Id },
                ApiResponse<TeamDto>.Ok(team, "Team created successfully."));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<TeamDto>>> Update(int id, UpdateTeamDto dto)
        {
            var team = await _teamCatalogService.UpdateTeamAsync(id, dto);
            return Ok(ApiResponse<TeamDto>.Ok(team, "Team updated successfully."));
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            await _teamCatalogService.DeleteTeamAsync(id);
            return Ok(ApiResponse<object>.Ok(null!, "Team deleted successfully."));
        }

        [HttpPut("{id:int}/members")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<TeamDto>>> SetMembers(int id, SetTeamMembersDto dto)
        {
            var team = await _teamCatalogService.SetTeamMembersAsync(id, dto);
            return Ok(ApiResponse<TeamDto>.Ok(team, "Team members updated successfully."));
        }

        [HttpPost("{id:int}/cover")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<TeamDto>>> UploadCover(int id, IFormFile file)
        {
            if (file is null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            await using var stream = file.OpenReadStream();
            var team = await _teamCatalogService.UploadCoverAsync(id, stream, file.FileName);
            return Ok(ApiResponse<TeamDto>.Ok(team, "Cover image uploaded successfully."));
        }

        [HttpDelete("{id:int}/cover")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<TeamDto>>> RemoveCover(int id)
        {
            var team = await _teamCatalogService.RemoveCoverAsync(id);
            return Ok(ApiResponse<TeamDto>.Ok(team, "Cover image removed."));
        }
    }
}
