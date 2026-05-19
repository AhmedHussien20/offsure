using OffsureManagementSystem.Application.DTOs.SkillManagementDTOs;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ISkillManagementService
    {
        Task<PagedResponse<SkillCategoryDto>> GetSkillCategoriesAsync(SkillCategoryRequest request);
        Task<SkillCategoryDto> GetSkillCategoryByIdAsync(int id);
        Task<SkillCategoryDto> CreateSkillCategoryAsync(CreateSkillCategoryDto dto);
        Task<SkillCategoryDto> UpdateSkillCategoryAsync(int id, UpdateSkillCategoryDto dto);
        Task DeleteSkillCategoryAsync(int id);

        Task<PagedResponse<SkillDto>> GetSkillsAsync(SkillRequest request);
        Task<SkillDto> GetSkillByIdAsync(int id);
        Task<SkillDto> CreateSkillAsync(CreateSkillDto dto);
        Task<SkillDto> UpdateSkillAsync(int id, UpdateSkillDto dto);
        Task DeleteSkillAsync(int id);
    }
}
