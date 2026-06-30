using OffsureManagementSystem.Application.DTOs.ServiceManagementDTOs;
using OffsureManagementSystem.Domain.Entities.Enum;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IServiceRequestManagementService
    {
        Task<PagedResponse<ServiceRequestDto>> GetAllRequestsAsync(ServiceRequestFilterRequest request);
        Task<PagedResponse<ServiceRequestDto>> GetClientRequestsAsync(int clientId, ServiceRequestFilterRequest request);
        Task<PagedResponse<ServiceRequestDto>> GetClientRequestsForUserAsync(int userId, ServiceRequestFilterRequest request);
        Task<ServiceRequestDto> GetRequestByIdAsync(int id);
        Task<ServiceRequestDto> GetRequestByIdForCallerAsync(int userId, string role, int id);
        Task<ServiceRequestDto> CreateRequestAsync(CreateServiceRequestDto dto, int userId);
        Task<ServiceRequestDto> UpdateRequestStatusAsync(int id, ServiceRequestStatus status);
        Task<ServiceRequestDto> CancelRequestAsync(int id);
        Task<ServiceRequestDto> CancelRequestForCallerAsync(int userId, string role, int id);
        Task SendNotificationAsync(ServiceRequestDto request);
    }
}
