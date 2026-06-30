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
        Task<TeamMemberDto> DeactivateAsync(int id);
        Task<TeamMemberDto> ActivateAsync(int id);
        Task<TeamMemberDto> DeactivateManagedTeamMemberAsync(int resourceManagerUserId, int teamMemberId);
        Task<TeamMemberDto> ActivateManagedTeamMemberAsync(int resourceManagerUserId, int teamMemberId);
        Task<TeamMemberDto> AssignSkillAsync(int teamMemberId, UpsertTeamMemberSkillDto dto);
        Task<TeamMemberDto> RemoveSkillAsync(int teamMemberId, int skillId);
        Task<CvStorageResultDto> StoreCvAsync(int teamMemberId, Stream content, string fileName);
        Task<IReadOnlyList<TeamStructureDto>> GetTeamStructureAsync();
        Task<TeamMemberDto> GetTeamMemberProfileAsync(int userId);
        Task<TeamMemberDto> UpdateTeamMemberProfileAsync(int userId, UpdateTeamMemberProfileDto dto);
        Task<TeamMemberDto> UpdateAvailabilityAsync(int userId, bool isAvailable);
        Task<TeamMemberDto> AssignSkillForUserAsync(int userId, UpsertTeamMemberSkillDto dto);
        Task<TeamMemberDto> RemoveSkillForUserAsync(int userId, int skillId);
        Task<CvStorageResultDto> StoreCvForUserAsync(int userId, Stream content, string fileName);
        Task<PagedResponse<ResourceManagerUserDto>> GetResourceManagersAsync(ResourceManagerRequest request);
        Task<ResourceManagerUserDto> GetResourceManagerByIdAsync(int userId);
        Task<ResourceManagerUserDto> CreateResourceManagerAsync(CreateResourceManagerDto dto);
        Task<ResourceManagerUserDto> UpdateResourceManagerAsync(int userId, UpdateResourceManagerDto dto);
        Task<ResourceManagerUserDto> DeactivateResourceManagerAsync(int userId);
        Task<ResourceManagerUserDto> ActivateResourceManagerAsync(int userId);
        Task DeleteResourceManagerAsync(int userId);
        Task<PagedResponse<SalesUserDto>> GetSalesUsersAsync(SalesUserRequest request);
        Task<SalesUserDto> GetSalesUserByIdAsync(int userId);
        Task<SalesUserDto> CreateSalesUserAsync(CreateSalesUserDto dto);
        Task<SalesUserDto> UpdateSalesUserAsync(int userId, UpdateSalesUserDto dto);
        Task<SalesUserDto> DeactivateSalesUserAsync(int userId);
        Task<SalesUserDto> ActivateSalesUserAsync(int userId);
        Task DeleteSalesUserAsync(int userId);
        Task<PagedResponse<TeamMemberDto>> GetManagedTeamMembersAsync(int resourceManagerUserId, TeamMemberRequest request);
        Task<TeamMemberDto> GetManagedTeamMemberByIdAsync(int resourceManagerUserId, int teamMemberId);
        Task<TeamMemberDto> CreateManagedTeamMemberAsync(int resourceManagerUserId, CreateTeamMemberDto dto);
        Task<TeamMemberDto> UpdateManagedTeamMemberAsync(int resourceManagerUserId, int teamMemberId, UpdateTeamMemberDto dto);
        Task DeleteManagedTeamMemberAsync(int resourceManagerUserId, int teamMemberId);
        Task<TeamMemberDto> AssignSkillForResourceManagerAsync(int resourceManagerUserId, int teamMemberId, UpsertTeamMemberSkillDto dto);
        Task<TeamMemberDto> RemoveSkillForResourceManagerAsync(int resourceManagerUserId, int teamMemberId, int skillId);
        Task EnsureTeamMemberManagedByAsync(int resourceManagerUserId, int teamMemberId);
        Task ResetTeamMemberPasswordAsync(int teamMemberId, ResetTeamMemberPasswordDto dto);
        Task ResetManagedTeamMemberPasswordAsync(int resourceManagerUserId, int teamMemberId, ResetTeamMemberPasswordDto dto);
        Task<TeamMemberDto> StoreProfilePhotoForUserAsync(int userId, Stream content, string fileName);
        Task<(Stream Stream, string FileName, string ContentType)?> OpenCvForUserAsync(int userId);
        Task DeleteCvForUserAsync(int userId);
        Task<TeamMemberDto> AddCertificateForUserAsync(int userId, UpsertTeamMemberCertificateDto dto);
        Task<TeamMemberDto> UpdateCertificateForUserAsync(int userId, int certificateId, UpsertTeamMemberCertificateDto dto);
        Task<TeamMemberDto> DeleteCertificateForUserAsync(int userId, int certificateId);
        Task<TeamMemberDto> AddExperienceForUserAsync(int userId, UpsertTeamMemberExperienceDto dto);
        Task<TeamMemberDto> UpdateExperienceForUserAsync(int userId, int experienceId, UpsertTeamMemberExperienceDto dto);
        Task<TeamMemberDto> DeleteExperienceForUserAsync(int userId, int experienceId);
        Task<TeamMemberDto> StoreIntroVideoForUserAsync(int userId, Stream content, string fileName);
        Task DeleteIntroVideoForUserAsync(int userId);
        IntroVideoSettingsDto GetIntroVideoSettings();
    }
}
