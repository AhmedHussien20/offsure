using OffsureManagementSystem.Application.DTOs.PortfolioManagementDTOs;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IPortfolioManagementService
    {
        Task<PagedResponse<PortfolioDto>> GetAllPortfoliosAsync(PortfolioFilterRequest request);
        Task<PortfolioDto> GetPortfolioByIdAsync(int id, bool includeUnpublished = false);
        Task<PortfolioDto> AddPortfolioAsync(AddPortfolioDto dto);
        Task<PortfolioDto> UpdatePortfolioAsync(int id, UpdatePortfolioDto dto);
        Task DeletePortfolioAsync(int id);
        Task<PortfolioDto> UploadImageAsync(int portfolioId, Stream content, string fileName, string? imageAltText, int displayOrder);
        Task<PortfolioDto> LinkToServiceAsync(int portfolioId, int serviceId);
        Task<PortfolioDto> SetImageActiveAsync(int portfolioId, int imageId, bool isActive);
    }
}
