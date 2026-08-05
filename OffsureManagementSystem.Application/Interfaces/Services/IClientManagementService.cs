using OffsureManagementSystem.Application.Common.Requests;
using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IClientManagementService
    {
        Task<PagedResponse<ClientDto>> GetAllClientsAsync(ClientFilterRequest request);
        Task<ClientDto> CreateClientAsync(CreateClientDto dto);
        Task<ClientDto> CreateClientBySalesAsync(int salesUserId, CreateClientDto dto);
        Task<ClientDto> CreateOrganizationMemberAsync(int ownerClientId, CreateClientMemberDto dto);
        Task<IReadOnlyList<ClientDto>> GetOrganizationMembersAsync(int ownerClientId);
        /// <summary>Organization members for the signed-in owner (includes request/project counts).</summary>
        Task<PagedResponse<ClientDto>> GetMyOrganizationMembersAsync(int userId, BaseApiRequest request);
        Task<PagedResponse<ClientDto>> GetClientsBySalesUserAsync(int salesUserId, ClientFilterRequest request);
        Task<ClientDto> GetClientByIdAsync(int id);
        Task<ClientDto> GetClientProfileAsync(int userId);
        Task<IReadOnlyList<ClientServiceRequestSummaryDto>> GetClientRecentServiceRequestsAsync(int userId, int limit = 5);
        Task<IReadOnlyList<ClientServiceRequestSummaryDto>> GetClientRecentServiceRequestsByClientIdAsync(int clientId, int limit = 5);
        Task<ClientDto> UpdateClientProfileAsync(int userId, UpdateClientProfileDto dto);
        Task<ClientDto> DeactivateClientAsync(int id, bool includeOrganizationMembers = false);
        Task<ClientDto> ActivateClientAsync(int id);
    }
}
