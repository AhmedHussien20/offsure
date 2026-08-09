using OffsureManagementSystem.Application.DTOs.LandingPageDTOs;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ILandingPageContentService
    {
        /// <summary>Public: visible sections only, seeded if empty.</summary>
        Task<IReadOnlyList<LandingPageSectionDto>> GetPublicSectionsAsync();

        /// <summary>Admin: all sections including hidden, seeded if empty.</summary>
        Task<IReadOnlyList<LandingPageSectionDto>> GetAdminSectionsAsync();

        Task<LandingPageSectionDto> GetByKeyAsync(string sectionKey, bool publicOnly);

        Task<LandingPageSectionDto> UpdateSectionAsync(string sectionKey, UpdateLandingPageSectionDto dto, int? updatedBy);

        Task<IReadOnlyList<LandingPageSectionDto>> BulkUpdateAsync(BulkUpdateLandingPageSectionsDto dto, int? updatedBy);
    }
}
