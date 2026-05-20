using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.ServiceManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using System.Security.Claims;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/service-requests")]
    [ApiController]
    public class ServiceRequestsController : BaseController
    {
        private readonly IServiceRequestManagementService _serviceRequestManagementService;

        public ServiceRequestsController(IServiceRequestManagementService serviceRequestManagementService)
        {
            _serviceRequestManagementService = serviceRequestManagementService;
        }

        [HttpGet]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<PagedResponse<ServiceRequestDto>>>> GetAllRequests(
            [FromQuery] ServiceRequestFilterRequest request)
        {
            var requests = await _serviceRequestManagementService.GetAllRequestsAsync(request);
            return Ok(ApiResponse<PagedResponse<ServiceRequestDto>>.Ok(requests));
        }

        [HttpGet("client/{clientId:int}")]
        [Authorize(Roles = "Administrator,Client")]
        public async Task<ActionResult<ApiResponse<PagedResponse<ServiceRequestDto>>>> GetClientRequests(
            int clientId,
            [FromQuery] ServiceRequestFilterRequest request)
        {
            var requests = await _serviceRequestManagementService.GetClientRequestsAsync(clientId, request);
            return Ok(ApiResponse<PagedResponse<ServiceRequestDto>>.Ok(requests));
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Administrator,Client")]
        public async Task<ActionResult<ApiResponse<ServiceRequestDto>>> GetRequestById(int id)
        {
            var request = await _serviceRequestManagementService.GetRequestByIdAsync(id);
            return Ok(ApiResponse<ServiceRequestDto>.Ok(request));
        }

        [HttpPost]
        [Authorize(Roles = "Client")]
        public async Task<ActionResult<ApiResponse<ServiceRequestDto>>> CreateRequest(CreateServiceRequestDto dto)
        {
            var userId = GetCurrentUserId();
            var request = await _serviceRequestManagementService.CreateRequestAsync(dto, userId);
            return CreatedAtAction(
                nameof(GetRequestById),
                new { id = request.Id },
                ApiResponse<ServiceRequestDto>.Ok(request, "Service request created successfully."));
        }

        [HttpPatch("{id:int}/status")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ServiceRequestDto>>> UpdateRequestStatus(
            int id,
            UpdateServiceRequestStatusDto dto)
        {
            var request = await _serviceRequestManagementService.UpdateRequestStatusAsync(id, dto.Status);
            return Ok(ApiResponse<ServiceRequestDto>.Ok(request, "Service request status updated successfully."));
        }

        [HttpPatch("{id:int}/cancel")]
        [Authorize(Roles = "Administrator,Client")]
        public async Task<ActionResult<ApiResponse<ServiceRequestDto>>> CancelRequest(int id)
        {
            var request = await _serviceRequestManagementService.CancelRequestAsync(id);
            return Ok(ApiResponse<ServiceRequestDto>.Ok(request, "Service request cancelled successfully."));
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
