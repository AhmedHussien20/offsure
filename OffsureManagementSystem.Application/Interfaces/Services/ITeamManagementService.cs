using OffsureManagementSystem.Application.DTOs.TeamManagementDTOs;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ITeamManagementService
    {
        Task<IReadOnlyList<TeamMemberDto>> GetAllAsync();
        Task<TeamMemberDto> GetByIdAsync(int id);
        Task<TeamMemberDto> CreateAsync(CreateTeamMemberDto dto);
        Task<TeamMemberDto> UpdateAsync(int id, UpdateTeamMemberDto dto);
        Task DeleteAsync(int id);
        Task<TeamMemberDto> AssignSkillAsync(int teamMemberId, UpsertTeamMemberSkillDto dto);
        Task<TeamMemberDto> RemoveSkillAsync(int teamMemberId, int skillId);
        Task<CvStorageResultDto> GenerateCvAsync(int teamMemberId);
        Task<CvStorageResultDto> StoreCvAsync(int teamMemberId, Stream content, string fileName);
        Task<IReadOnlyList<TeamStructureDto>> GetTeamStructureAsync();
    }
}
