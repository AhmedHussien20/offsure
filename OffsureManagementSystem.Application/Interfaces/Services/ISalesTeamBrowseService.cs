using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ISalesTeamBrowseService
    {
        Task<PagedResponse<ClientTeamMemberCardDto>> BrowseTeamMembersAsync(
            int salesUserId,
            ClientTeamMemberBrowseRequest request);

        Task<ClientTeamMemberDetailDto> GetTeamMemberDetailAsync(int salesUserId, int teamMemberId);
    }

}
