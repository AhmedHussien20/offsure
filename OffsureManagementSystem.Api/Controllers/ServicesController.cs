using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.ServiceManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/services")]
    [ApiController]
    [Authorize(Roles = "Administrator,ResourceManager")]
    public class ServicesController : BaseController
    {
        private readonly IServiceManagementService _serviceManagementService;

        public ServicesController(IServiceManagementService serviceManagementService)
        {
            _serviceManagementService = serviceManagementService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResponse<ServiceDto>>>> GetAll(
            [FromQuery] ServiceFilterRequest request)
        {
            var services = await _serviceManagementService.GetServicesAsync(request);
            return Ok(ApiResponse<PagedResponse<ServiceDto>>.Ok(services));
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<PagedResponse<ServiceDto>>>> GetPublicServices(
            [FromQuery] PublicServiceFilterRequest request)
        {
            var services = await _serviceManagementService.GetPublicServicesAsync(request);
            return Ok(ApiResponse<PagedResponse<ServiceDto>>.Ok(services));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<ServiceDto>>> GetById(int id)
        {
            var service = await _serviceManagementService.GetServiceByIdAsync(id);
            return Ok(ApiResponse<ServiceDto>.Ok(service));
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ServiceDto>>> Create(CreateServiceDto dto)
        {
            var service = await _serviceManagementService.CreateServiceAsync(dto);
            return CreatedAtAction(
                nameof(GetById),
                new { id = service.Id },
                ApiResponse<ServiceDto>.Ok(service, "Service created successfully."));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<ServiceDto>>> Update(int id, UpdateServiceDto dto)
        {
            var service = await _serviceManagementService.UpdateServiceAsync(id, dto);
            return Ok(ApiResponse<ServiceDto>.Ok(service, "Service updated successfully."));
        }

        [HttpPatch("{id:int}/visibility")]
        public async Task<ActionResult<ApiResponse<ServiceDto>>> SetVisibility(
            int id,
            UpdateServiceVisibilityDto dto)
        {
            var service = await _serviceManagementService.SetServiceVisibilityAsync(id, dto.IsVisible);
            return Ok(ApiResponse<ServiceDto>.Ok(service, "Service visibility updated successfully."));
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            await _serviceManagementService.DeleteServiceAsync(id);
            return Ok(ApiResponse<object>.Ok(null!, "Service deleted successfully."));
        }
    }
}
