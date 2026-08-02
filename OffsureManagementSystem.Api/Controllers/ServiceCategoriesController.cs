using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.ServiceManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/service-categories")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class ServiceCategoriesController : BaseController
    {
        private readonly IServiceManagementService _serviceManagementService;

        public ServiceCategoriesController(IServiceManagementService serviceManagementService)
        {
            _serviceManagementService = serviceManagementService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResponse<ServiceCategoryDto>>>> GetAll(
            [FromQuery] ServiceCategoryRequest request)
        {
            var categories = await _serviceManagementService.GetServiceCategoriesAsync(request);
            return Ok(ApiResponse<PagedResponse<ServiceCategoryDto>>.Ok(categories));
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<PagedResponse<ServiceCategoryDto>>>> GetPublicServiceCategories(
            [FromQuery] ServiceCategoryRequest request)
        {
            var categories = await _serviceManagementService.GetPublicServiceCategoriesAsync(request);
            return Ok(ApiResponse<PagedResponse<ServiceCategoryDto>>.Ok(categories));
        }

        [HttpGet("public/catalog")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<PagedResponse<ServiceCatalogCategoryDto>>>> GetPublicServiceCatalog(
            [FromQuery] ServiceCategoryRequest request)
        {
            var catalog = await _serviceManagementService.GetPublicServiceCatalogAsync(request);
            return Ok(ApiResponse<PagedResponse<ServiceCatalogCategoryDto>>.Ok(catalog));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<ServiceCategoryDto>>> GetById(int id)
        {
            var category = await _serviceManagementService.GetServiceCategoryByIdAsync(id);
            return Ok(ApiResponse<ServiceCategoryDto>.Ok(category));
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ServiceCategoryDto>>> Create(CreateServiceCategoryDto dto)
        {
            var category = await _serviceManagementService.CreateServiceCategoryAsync(dto);
            return CreatedAtAction(
                nameof(GetById),
                new { id = category.Id },
                ApiResponse<ServiceCategoryDto>.Ok(category, "Service category created successfully."));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<ServiceCategoryDto>>> Update(
            int id,
            UpdateServiceCategoryDto dto)
        {
            var category = await _serviceManagementService.UpdateServiceCategoryAsync(id, dto);
            return Ok(ApiResponse<ServiceCategoryDto>.Ok(category, "Service category updated successfully."));
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            await _serviceManagementService.DeleteServiceCategoryAsync(id);
            return Ok(ApiResponse<object>.Ok(null!, "Service category deleted successfully."));
        }
    }
}
