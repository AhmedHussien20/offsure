using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using System.Security.Claims;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/clients")]
    [ApiController]
    public class ClientsController : BaseController
    {
        private readonly IClientManagementService _clientManagementService;

        public ClientsController(IClientManagementService clientManagementService)
        {
            _clientManagementService = clientManagementService;
        }

        [HttpGet]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<PagedResponse<ClientDto>>>> GetAllClients(
            [FromQuery] ClientFilterRequest request)
        {
            var clients = await _clientManagementService.GetAllClientsAsync(request);
            return Ok(ApiResponse<PagedResponse<ClientDto>>.Ok(clients));
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> CreateClient(CreateClientDto dto)
        {
            var client = await _clientManagementService.CreateClientAsync(dto);
            return Ok(ApiResponse<ClientDto>.Ok(client, "Client created successfully."));
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> GetClientById(int id)
        {
            var client = await _clientManagementService.GetClientByIdAsync(id);
            return Ok(ApiResponse<ClientDto>.Ok(client));
        }

        [HttpGet("{id:int}/recent-requests")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<ClientServiceRequestSummaryDto>>>> GetClientRecentRequests(
            int id,
            [FromQuery] int limit = 5)
        {
            var requests = await _clientManagementService.GetClientRecentServiceRequestsByClientIdAsync(id, limit);
            return Ok(ApiResponse<IReadOnlyList<ClientServiceRequestSummaryDto>>.Ok(requests));
        }

        [HttpGet("profile")]
        [Authorize(Roles = "Client")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> GetClientProfile()
        {
            var client = await _clientManagementService.GetClientProfileAsync(GetCurrentUserId());
            return Ok(ApiResponse<ClientDto>.Ok(client));
        }

        [HttpGet("profile/recent-requests")]
        [Authorize(Roles = "Client")]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<ClientServiceRequestSummaryDto>>>> GetClientRecentServiceRequests(
            [FromQuery] int limit = 5)
        {
            var requests = await _clientManagementService.GetClientRecentServiceRequestsAsync(
                GetCurrentUserId(),
                limit);
            return Ok(ApiResponse<IReadOnlyList<ClientServiceRequestSummaryDto>>.Ok(requests));
        }

        [HttpPut("profile")]
        [Authorize(Roles = "Client")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> UpdateClientProfile(UpdateClientProfileDto dto)
        {
            var client = await _clientManagementService.UpdateClientProfileAsync(GetCurrentUserId(), dto);
            return Ok(ApiResponse<ClientDto>.Ok(client, "Client profile updated successfully."));
        }

        [HttpPatch("{id:int}/deactivate")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ClientDto>>> DeactivateClient(int id)
        {
            var client = await _clientManagementService.DeactivateClientAsync(id);
            return Ok(ApiResponse<ClientDto>.Ok(client, "Client deactivated successfully."));
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
