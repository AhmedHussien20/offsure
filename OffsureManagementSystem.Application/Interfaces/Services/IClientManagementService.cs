using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IClientManagementService
    {
        Task<PagedResponse<ClientDto>> GetAllClientsAsync(ClientFilterRequest request);
        Task<ClientDto> GetClientByIdAsync(int id);
        Task<ClientDto> GetClientProfileAsync(int userId);
        Task<ClientDto> UpdateClientProfileAsync(int userId, UpdateClientProfileDto dto);
        Task<ClientDto> DeactivateClientAsync(int id);
    }
}
