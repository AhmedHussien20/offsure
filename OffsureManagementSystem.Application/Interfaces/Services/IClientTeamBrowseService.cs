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

        /// <summary>Org showcase: all active team members (not limited to the client's projects).</summary>
        Task<PagedResponse<ClientTeamMemberCardDto>> BrowseShowcaseTeamMembersAsync(
            ClientTeamMemberBrowseRequest request);

        Task<ClientTeamMemberDetailDto> GetShowcaseTeamMemberDetailAsync(int teamMemberId);
    }
}
