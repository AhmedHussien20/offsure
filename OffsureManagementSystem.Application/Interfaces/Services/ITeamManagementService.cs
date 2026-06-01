using OffsureManagementSystem.Application.DTOs.TeamManagementDTOs;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ITeamManagementService
    {
        Task<PagedResponse<TeamMemberDto>> GetAllAsync(TeamMemberRequest request);
        Task<TeamMemberDto> GetByIdAsync(int id);
        Task<TeamMemberDto> CreateAsync(CreateTeamMemberDto dto);
        Task<TeamMemberDto> UpdateAsync(int id, UpdateTeamMemberDto dto);
        Task DeleteAsync(int id);
        Task<TeamMemberDto> AssignSkillAsync(int teamMemberId, UpsertTeamMemberSkillDto dto);
        Task<TeamMemberDto> RemoveSkillAsync(int teamMemberId, int skillId);
        Task<CvStorageResultDto> GenerateCvAsync(int teamMemberId);
        Task<CvStorageResultDto> StoreCvAsync(int teamMemberId, Stream content, string fileName);
        Task<IReadOnlyList<TeamStructureDto>> GetTeamStructureAsync();
        Task<TeamMemberDto> GetTeamMemberProfileAsync(int userId);
        Task<TeamMemberDto> UpdateTeamMemberProfileAsync(int userId, UpdateTeamMemberProfileDto dto);
        Task<TeamMemberDto> UpdateAvailabilityAsync(int userId, bool isAvailable);
        Task<TeamMemberDto> AssignSkillForUserAsync(int userId, UpsertTeamMemberSkillDto dto);
        Task<TeamMemberDto> RemoveSkillForUserAsync(int userId, int skillId);
        Task<CvStorageResultDto> GenerateCvForUserAsync(int userId);
        Task<CvStorageResultDto> StoreCvForUserAsync(int userId, Stream content, string fileName);
    }
}
