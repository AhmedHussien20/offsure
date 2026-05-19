using Microsoft.EntityFrameworkCore;
using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.SkillManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class SkillManagementService : ISkillManagementService
    {
        private readonly IRepository<SkillCategory> _skillCategoryRepo;
        private readonly IRepository<Skill> _skillRepo;
        private readonly IRepository<TeamMemberSkill> _teamMemberSkillRepo;

        public SkillManagementService(
            IRepository<SkillCategory> skillCategoryRepo,
            IRepository<Skill> skillRepo,
            IRepository<TeamMemberSkill> teamMemberSkillRepo)
        {
            _skillCategoryRepo = skillCategoryRepo;
            _skillRepo = skillRepo;
            _teamMemberSkillRepo = teamMemberSkillRepo;
        }

        public async Task<PagedResponse<SkillCategoryDto>> GetSkillCategoriesAsync(SkillCategoryRequest request)
        {
            IQueryable<SkillCategory> query = _skillCategoryRepo
                .Query()
                .Include(c => c.Skills);

            if (request.Id.HasValue)
                query = query.Where(c => c.Id == request.Id.Value);

            if (request.IsActive.HasValue)
                query = query.Where(c => c.IsActive == request.IsActive.Value);

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(c =>
                    c.Name.ToLower().Contains(searchKey)
                    || c.Description.ToLower().Contains(searchKey));
            }

            var totalCount = await query.CountAsync();
            var categories = await ApplyCategorySorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<SkillCategoryDto>(
                categories.Select(MapCategory).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<SkillCategoryDto> GetSkillCategoryByIdAsync(int id)
        {
            var category = await _skillCategoryRepo
                .Query()
                .Include(c => c.Skills)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category is null)
                throw new AppException("Resource not found.", 404);

            return MapCategory(category);
        }

        public async Task<SkillCategoryDto> CreateSkillCategoryAsync(CreateSkillCategoryDto dto)
        {
            ValidateCategoryInput(dto.Name);
            await EnsureSkillCategoryNameIsUniqueAsync(dto.Name);

            var category = new SkillCategory
            {
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                DisplayOrder = dto.DisplayOrder,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            await _skillCategoryRepo.AddAsync(category);
            await _skillCategoryRepo.SaveChangesAsync();

            return await GetSkillCategoryByIdAsync(category.Id);
        }

        public async Task<SkillCategoryDto> UpdateSkillCategoryAsync(int id, UpdateSkillCategoryDto dto)
        {
            ValidateCategoryInput(dto.Name);
            await EnsureSkillCategoryNameIsUniqueAsync(dto.Name, id);

            var category = await _skillCategoryRepo.GetByIDAsync(id);
            if (category is null)
                throw new AppException("Resource not found.", 404);

            category.Name = dto.Name.Trim();
            category.Description = dto.Description?.Trim() ?? string.Empty;
            category.DisplayOrder = dto.DisplayOrder;
            category.IsActive = dto.IsActive;
            category.UpdatedAt = DateTime.UtcNow;

            _skillCategoryRepo.SaveInclude(
                category,
                nameof(category.Name),
                nameof(category.Description),
                nameof(category.DisplayOrder),
                nameof(category.IsActive),
                nameof(category.UpdatedAt));

            await _skillCategoryRepo.SaveChangesAsync();
            return await GetSkillCategoryByIdAsync(id);
        }

        public async Task DeleteSkillCategoryAsync(int id)
        {
            var category = await _skillCategoryRepo
                .Query()
                .Include(c => c.Skills)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category is null)
                throw new AppException("Resource not found.", 404);

            if (category.Skills.Any())
                throw new AppException("Invalid request.", 400);

            _skillCategoryRepo.SoftDelete(category);
            await _skillCategoryRepo.SaveChangesAsync();
        }

        public async Task<PagedResponse<SkillDto>> GetSkillsAsync(SkillRequest request)
        {
            var query = BuildSkillQuery();

            if (request.Id.HasValue)
                query = query.Where(s => s.Id == request.Id.Value);

            if (request.SkillCategoryId.HasValue)
                query = query.Where(s => s.SkillCategoryId == request.SkillCategoryId.Value);

            if (request.IsActive.HasValue)
                query = query.Where(s => s.IsActive == request.IsActive.Value);

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(s =>
                    s.Name.ToLower().Contains(searchKey)
                    || s.Description.ToLower().Contains(searchKey)
                    || s.SkillCategory.Name.ToLower().Contains(searchKey));
            }

            var totalCount = await query.CountAsync();
            var skills = await ApplySkillSorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<SkillDto>(
                skills.Select(MapSkill).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<SkillDto> GetSkillByIdAsync(int id)
        {
            var skill = await BuildSkillQuery()
                .FirstOrDefaultAsync(s => s.Id == id);

            if (skill is null)
                throw new AppException("Resource not found.", 404);

            return MapSkill(skill);
        }

        public async Task<SkillDto> CreateSkillAsync(CreateSkillDto dto)
        {
            ValidateSkillInput(dto.Name, dto.SkillCategoryId);
            await EnsureSkillCategoryExistsAsync(dto.SkillCategoryId);
            await EnsureSkillNameIsUniqueInCategoryAsync(dto.Name, dto.SkillCategoryId);

            var skill = new Skill
            {
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                SkillCategoryId = dto.SkillCategoryId,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            await _skillRepo.AddAsync(skill);
            await _skillRepo.SaveChangesAsync();

            return await GetSkillByIdAsync(skill.Id);
        }

        public async Task<SkillDto> UpdateSkillAsync(int id, UpdateSkillDto dto)
        {
            ValidateSkillInput(dto.Name, dto.SkillCategoryId);
            await EnsureSkillCategoryExistsAsync(dto.SkillCategoryId);
            await EnsureSkillNameIsUniqueInCategoryAsync(dto.Name, dto.SkillCategoryId, id);

            var skill = await _skillRepo.GetByIDAsync(id);
            if (skill is null)
                throw new AppException("Resource not found.", 404);

            skill.Name = dto.Name.Trim();
            skill.Description = dto.Description?.Trim() ?? string.Empty;
            skill.SkillCategoryId = dto.SkillCategoryId;
            skill.IsActive = dto.IsActive;
            skill.UpdatedAt = DateTime.UtcNow;

            _skillRepo.SaveInclude(
                skill,
                nameof(skill.Name),
                nameof(skill.Description),
                nameof(skill.SkillCategoryId),
                nameof(skill.IsActive),
                nameof(skill.UpdatedAt));

            await _skillRepo.SaveChangesAsync();
            return await GetSkillByIdAsync(id);
        }

        public async Task DeleteSkillAsync(int id)
        {
            var skill = await _skillRepo.GetByIDAsync(id);
            if (skill is null)
                throw new AppException("Resource not found.", 404);

            var isAssignedToTeamMember = await _teamMemberSkillRepo
                .GetAll(ts => ts.SkillId == id)
                .AnyAsync();

            if (isAssignedToTeamMember)
                throw new AppException("Invalid request.", 400);

            _skillRepo.SoftDelete(skill);
            await _skillRepo.SaveChangesAsync();
        }

        private IQueryable<Skill> BuildSkillQuery()
        {
            return _skillRepo
                .Query()
                .Include(s => s.SkillCategory)
                .Include(s => s.TeamMemberSkills);
        }

        private async Task EnsureSkillCategoryExistsAsync(int id)
        {
            if (id <= 0 || !await _skillCategoryRepo.IsExistAsync(id))
                throw new AppException("Resource not found.", 404);
        }

        private async Task EnsureSkillCategoryNameIsUniqueAsync(string name, int? currentId = null)
        {
            var normalizedName = Normalize(name);
            var exists = await _skillCategoryRepo
                .GetAll(c => c.Name.ToLower() == normalizedName && (!currentId.HasValue || c.Id != currentId.Value))
                .AnyAsync();

            if (exists)
                throw new AppException("Invalid request.", 400);
        }

        private async Task EnsureSkillNameIsUniqueInCategoryAsync(string name, int categoryId, int? currentId = null)
        {
            var normalizedName = Normalize(name);
            var exists = await _skillRepo
                .GetAll(s =>
                    s.SkillCategoryId == categoryId
                    && s.Name.ToLower() == normalizedName
                    && (!currentId.HasValue || s.Id != currentId.Value))
                .AnyAsync();

            if (exists)
                throw new AppException("Invalid request.", 400);
        }

        private static void ValidateCategoryInput(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new AppException("Invalid request.", 400);
        }

        private static void ValidateSkillInput(string name, int categoryId)
        {
            if (string.IsNullOrWhiteSpace(name) || categoryId <= 0)
                throw new AppException("Invalid request.", 400);
        }

        private static string Normalize(string value)
            => value.Trim().ToLowerInvariant();

        private static IQueryable<SkillCategory> ApplyCategorySorting(
            IQueryable<SkillCategory> query,
            SkillCategoryRequest request)
        {
            var isDescending = IsDescending(request.SortDirection);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "name" => isDescending ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name),
                "displayorder" => isDescending ? query.OrderByDescending(c => c.DisplayOrder) : query.OrderBy(c => c.DisplayOrder),
                "isactive" => isDescending ? query.OrderByDescending(c => c.IsActive) : query.OrderBy(c => c.IsActive),
                "skillscount" => isDescending ? query.OrderByDescending(c => c.Skills.Count) : query.OrderBy(c => c.Skills.Count),
                _ => isDescending ? query.OrderByDescending(c => c.Id) : query.OrderBy(c => c.Id)
            };
        }

        private static IQueryable<Skill> ApplySkillSorting(
            IQueryable<Skill> query,
            SkillRequest request)
        {
            var isDescending = IsDescending(request.SortDirection);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "name" => isDescending ? query.OrderByDescending(s => s.Name) : query.OrderBy(s => s.Name),
                "skillcategoryid" => isDescending ? query.OrderByDescending(s => s.SkillCategoryId) : query.OrderBy(s => s.SkillCategoryId),
                "skillcategoryname" => isDescending ? query.OrderByDescending(s => s.SkillCategory.Name) : query.OrderBy(s => s.SkillCategory.Name),
                "isactive" => isDescending ? query.OrderByDescending(s => s.IsActive) : query.OrderBy(s => s.IsActive),
                "assignedteammemberscount" => isDescending ? query.OrderByDescending(s => s.TeamMemberSkills.Count) : query.OrderBy(s => s.TeamMemberSkills.Count),
                _ => isDescending ? query.OrderByDescending(s => s.Id) : query.OrderBy(s => s.Id)
            };
        }

        private static bool IsDescending(string sortDirection)
            => !string.Equals(sortDirection, "ASC", StringComparison.OrdinalIgnoreCase);

        private static int GetPageIndex(SkillCategoryRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageIndex(SkillRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(SkillCategoryRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetPageSize(SkillRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(SkillCategoryRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private static int GetSkipCount(SkillRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private static SkillCategoryDto MapCategory(SkillCategory category)
        {
            return new SkillCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                DisplayOrder = category.DisplayOrder,
                IsActive = category.IsActive,
                SkillsCount = category.Skills.Count
            };
        }

        private static SkillDto MapSkill(Skill skill)
        {
            return new SkillDto
            {
                Id = skill.Id,
                Name = skill.Name,
                Description = skill.Description,
                SkillCategoryId = skill.SkillCategoryId,
                SkillCategoryName = skill.SkillCategory?.Name ?? string.Empty,
                IsActive = skill.IsActive,
                AssignedTeamMembersCount = skill.TeamMemberSkills.Count
            };
        }
    }
}
