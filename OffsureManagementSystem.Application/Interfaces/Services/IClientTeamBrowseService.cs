using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IClientTeamBrowseService
    {
        Task<PagedResponse<ClientTeamMemberCardDto>> BrowseTeamMembersAsync(
            int clientUserId,
            ClientTeamMemberBrowseRequest request);

        Task<ClientTeamMemberDetailDto> GetTeamMemberDetailAsync(int clientUserId, int teamMemberId);
    }
}
