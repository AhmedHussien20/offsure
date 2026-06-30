using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using OffsureManagementSystem.Application.DTOs.ProjectManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using System.Security.Claims;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/sales")]
    [ApiController]
    [Authorize(Roles = "Sales")]
    public class SalesPortalController : BaseController
    {
        private readonly ISalesTeamBrowseService _salesTeamBrowseService;
        private readonly IProjectManagementService _projectManagementService;
        private readonly IClientManagementService _clientManagementService;

        public SalesPortalController(
            ISalesTeamBrowseService salesTeamBrowseService,
            IProjectManagementService projectManagementService,
            IClientManagementService clientManagementService)
        {
            _salesTeamBrowseService = salesTeamBrowseService;
            _projectManagementService = projectManagementService;
            _clientManagementService = clientManagementService;
        }

        [HttpGet("team-members")]
        public async Task<ActionResult<ApiResponse<PagedResponse<ClientTeamMemberCardDto>>>> BrowseTeamMembers(
            [FromQuery] ClientTeamMemberBrowseRequest request)
        {
            var members = await _salesTeamBrowseService.BrowseTeamMembersAsync(GetCurrentUserId(), request);
            return Ok(ApiResponse<PagedResponse<ClientTeamMemberCardDto>>.Ok(members));
        }

        [HttpGet("team-members/{teamMemberId:int}")]
        public async Task<ActionResult<ApiResponse<ClientTeamMemberDetailDto>>> GetTeamMemberDetail(int teamMemberId)
        {
            var member = await _salesTeamBrowseService.GetTeamMemberDetailAsync(GetCurrentUserId(), teamMemberId);
            return Ok(ApiResponse<ClientTeamMemberDetailDto>.Ok(member));
        }

        [HttpGet("projects")]
        public async Task<ActionResult<ApiResponse<PagedResponse<SalesProjectSummaryDto>>>> GetMyProjects(
            [FromQuery] ProjectFilterRequest request)
        {
            var projects = await _projectManagementService.GetSalesProjectsByUserIdAsync(GetCurrentUserId(), request);
            return Ok(ApiResponse<PagedResponse<SalesProjectSummaryDto>>.Ok(projects));
        }

        [HttpGet("projects/{id:int}")]
        public async Task<ActionResult<ApiResponse<SalesProjectSummaryDto>>> GetMyProjectById(int id)
        {
            var project = await _projectManagementService.GetSalesProjectByIdAsync(GetCurrentUserId(), id);
            return Ok(ApiResponse<SalesProjectSummaryDto>.Ok(project));
        }

        [HttpGet("clients")]
        public async Task<ActionResult<ApiResponse<PagedResponse<ClientDto>>>> GetMyClients(
            [FromQuery] ClientFilterRequest request)
        {
            var clients = await _clientManagementService.GetClientsBySalesUserAsync(GetCurrentUserId(), request);
            return Ok(ApiResponse<PagedResponse<ClientDto>>.Ok(clients));
        }

        [HttpPost("clients")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> CreateClient(CreateClientDto dto)
        {
            var client = await _clientManagementService.CreateClientBySalesAsync(GetCurrentUserId(), dto);
            return Ok(ApiResponse<ClientDto>.Ok(client, "Client created successfully."));
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
