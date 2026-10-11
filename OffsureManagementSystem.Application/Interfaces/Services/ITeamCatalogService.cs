using OffsureManagementSystem.Application.DTOs.TeamCatalogDTOs;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ITeamCatalogService
    {
        Task<PagedResponse<TeamDto>> GetTeamsAsync(TeamRequest request);
        Task<TeamDto> GetTeamByIdAsync(int id);
        Task<TeamDto> CreateTeamAsync(CreateTeamDto dto);
        Task<TeamDto> UpdateTeamAsync(int id, UpdateTeamDto dto);
        Task DeleteTeamAsync(int id);

        Task<TeamDto> UploadCoverAsync(int id, Stream content, string fileName);
        Task<TeamDto> RemoveCoverAsync(int id);

        Task<List<TeamMemberOptionDto>> GetTeamMemberOptionsAsync();
        Task<TeamDto> SetTeamMembersAsync(int id, SetTeamMembersDto dto);

        /// <summary>Active teams with members, as shown on the Offshore TechX "Offshore team" tab.</summary>
        Task<TeamCatalogDto> GetCatalogAsync(TeamCatalogRequest request);
    }
}
