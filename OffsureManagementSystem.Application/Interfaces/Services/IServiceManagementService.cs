using OffsureManagementSystem.Application.DTOs.ServiceManagementDTOs;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IServiceManagementService
    {
        Task<PagedResponse<ServiceCategoryDto>> GetServiceCategoriesAsync(ServiceCategoryRequest request);
        Task<PagedResponse<ServiceCategoryDto>> GetPublicServiceCategoriesAsync(ServiceCategoryRequest request);
        Task<PagedResponse<ServiceCatalogCategoryDto>> GetPublicServiceCatalogAsync(ServiceCategoryRequest request);
        Task<ServiceCategoryDto> GetServiceCategoryByIdAsync(int id);
        Task<ServiceCategoryDto> CreateServiceCategoryAsync(CreateServiceCategoryDto dto);
        Task<ServiceCategoryDto> UpdateServiceCategoryAsync(int id, UpdateServiceCategoryDto dto);
        Task DeleteServiceCategoryAsync(int id);

        Task<PagedResponse<ServiceDto>> GetServicesAsync(ServiceFilterRequest request);
        Task<PagedResponse<ServiceDto>> GetPublicServicesAsync(PublicServiceFilterRequest request);
        Task<ServiceDto> GetServiceByIdAsync(int id);
        Task<ServiceDto> CreateServiceAsync(CreateServiceDto dto);
        Task<ServiceDto> UpdateServiceAsync(int id, UpdateServiceDto dto);
        Task<ServiceDto> SetServiceVisibilityAsync(int id, bool isVisible);
        Task DeleteServiceAsync(int id);
    }
}
