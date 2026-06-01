using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.ServiceManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities;
using OffshoreManagementSystem.Domain.Entities;
using TaskMangment.Application.Common.Responses;
using DomainService = OffshoreManagementSystem.Domain.Entities.Service;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ServiceManagementService : IServiceManagementService
    {
        private readonly IRepository<ServiceCategory> _serviceCategoryRepo;
        private readonly IRepository<DomainService> _serviceRepo;
        private readonly IRepository<ServiceRequest> _serviceRequestRepo;
        private readonly IRepository<PortfolioProject> _portfolioProjectRepo;

        public ServiceManagementService(
            IRepository<ServiceCategory> serviceCategoryRepo,
            IRepository<DomainService> serviceRepo,
            IRepository<ServiceRequest> serviceRequestRepo,
            IRepository<PortfolioProject> portfolioProjectRepo)
        {
            _serviceCategoryRepo = serviceCategoryRepo;
            _serviceRepo = serviceRepo;
            _serviceRequestRepo = serviceRequestRepo;
            _portfolioProjectRepo = portfolioProjectRepo;
        }

        public async Task<PagedResponse<ServiceCategoryDto>> GetServiceCategoriesAsync(ServiceCategoryRequest request)
        {
            IQueryable<ServiceCategory> query = _serviceCategoryRepo
                .Query()
                .Include(c => c.Services);

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

            return new PagedResponse<ServiceCategoryDto>(
                categories.Select(MapCategory).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<PagedResponse<ServiceCategoryDto>> GetPublicServiceCategoriesAsync(ServiceCategoryRequest request)
        {
            IQueryable<ServiceCategory> query = _serviceCategoryRepo
                .Query()
                .Include(c => c.Services)
                .Where(c => c.IsActive);

            if (request.Id.HasValue)
                query = query.Where(c => c.Id == request.Id.Value);

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

            return new PagedResponse<ServiceCategoryDto>(
                categories.Select(MapCategory).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<ServiceCategoryDto> GetServiceCategoryByIdAsync(int id)
        {
            var category = await _serviceCategoryRepo
                .Query()
                .Include(c => c.Services)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category is null)
                throw new AppException("Resource not found.", 404);

            return MapCategory(category);
        }

        public async Task<ServiceCategoryDto> CreateServiceCategoryAsync(CreateServiceCategoryDto dto)
        {
            ValidateCategoryInput(dto.Name);
            await EnsureServiceCategoryNameIsUniqueAsync(dto.Name);

            var category = new ServiceCategory
            {
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                IconUrl = dto.IconUrl?.Trim() ?? string.Empty,
                DisplayOrder = dto.DisplayOrder,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            await _serviceCategoryRepo.AddAsync(category);
            await _serviceCategoryRepo.SaveChangesAsync();

            return await GetServiceCategoryByIdAsync(category.Id);
        }

        public async Task<ServiceCategoryDto> UpdateServiceCategoryAsync(int id, UpdateServiceCategoryDto dto)
        {
            ValidateCategoryInput(dto.Name);
            await EnsureServiceCategoryNameIsUniqueAsync(dto.Name, id);

            var category = await _serviceCategoryRepo.GetByIDAsync(id);
            if (category is null)
                throw new AppException("Resource not found.", 404);

            category.Name = dto.Name.Trim();
            category.Description = dto.Description?.Trim() ?? string.Empty;
            category.IconUrl = dto.IconUrl?.Trim() ?? string.Empty;
            category.DisplayOrder = dto.DisplayOrder;
            category.IsActive = dto.IsActive;
            category.UpdatedAt = DateTime.UtcNow;

            _serviceCategoryRepo.SaveInclude(
                category,
                nameof(category.Name),
                nameof(category.Description),
                nameof(category.IconUrl),
                nameof(category.DisplayOrder),
                nameof(category.IsActive),
                nameof(category.UpdatedAt));

            await _serviceCategoryRepo.SaveChangesAsync();
            return await GetServiceCategoryByIdAsync(id);
        }

        public async Task DeleteServiceCategoryAsync(int id)
        {
            var category = await _serviceCategoryRepo
                .Query()
                .Include(c => c.Services)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category is null)
                throw new AppException("Resource not found.", 404);

            if (category.Services.Any())
                throw new AppException("Invalid request.", 400);

            _serviceCategoryRepo.SoftDelete(category);
            await _serviceCategoryRepo.SaveChangesAsync();
        }

        public async Task<PagedResponse<ServiceDto>> GetServicesAsync(ServiceFilterRequest request)
        {
            var query = BuildServiceQuery();

            if (request.Id.HasValue)
                query = query.Where(s => s.Id == request.Id.Value);

            if (request.ServiceCategoryId.HasValue)
                query = query.Where(s => s.ServiceCategoryId == request.ServiceCategoryId.Value);

            if (request.IsVisible.HasValue)
                query = query.Where(s => s.IsVisible == request.IsVisible.Value);

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(s =>
                    s.Name.ToLower().Contains(searchKey)
                    || s.Description.ToLower().Contains(searchKey)
                    || s.ServiceCategory.Name.ToLower().Contains(searchKey));
            }

            var totalCount = await query.CountAsync();
            var services = await ApplyServiceSorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<ServiceDto>(
                services.Select(MapService).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<PagedResponse<ServiceDto>> GetPublicServicesAsync(PublicServiceFilterRequest request)
        {
            var query = BuildServiceQuery()
                .Where(s => s.IsVisible && s.ServiceCategory.IsActive);

            if (request.Id.HasValue)
                query = query.Where(s => s.Id == request.Id.Value);

            if (request.ServiceCategoryId.HasValue)
                query = query.Where(s => s.ServiceCategoryId == request.ServiceCategoryId.Value);

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(s =>
                    s.Name.ToLower().Contains(searchKey)
                    || s.Description.ToLower().Contains(searchKey)
                    || s.ServiceCategory.Name.ToLower().Contains(searchKey));
            }

            var totalCount = await query.CountAsync();
            var services = await ApplyPublicServiceSorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<ServiceDto>(
                services.Select(MapService).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<ServiceDto> GetServiceByIdAsync(int id)
        {
            var service = await BuildServiceQuery()
                .FirstOrDefaultAsync(s => s.Id == id);

            if (service is null)
                throw new AppException("Resource not found.", 404);

            return MapService(service);
        }

        public async Task<ServiceDto> CreateServiceAsync(CreateServiceDto dto)
        {
            ValidateServiceInput(dto.Name, dto.ServiceCategoryId);
            await EnsureServiceCategoryExistsAsync(dto.ServiceCategoryId);
            await EnsureServiceNameIsUniqueInCategoryAsync(dto.Name, dto.ServiceCategoryId);

            var service = new DomainService
            {
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                ServiceCategoryId = dto.ServiceCategoryId,
                IconUrl = dto.IconUrl?.Trim() ?? string.Empty,
                IsVisible = dto.IsVisible,
                CreatedAt = DateTime.UtcNow
            };

            await _serviceRepo.AddAsync(service);
            await _serviceRepo.SaveChangesAsync();

            return await GetServiceByIdAsync(service.Id);
        }

        public async Task<ServiceDto> UpdateServiceAsync(int id, UpdateServiceDto dto)
        {
            ValidateServiceInput(dto.Name, dto.ServiceCategoryId);
            await EnsureServiceCategoryExistsAsync(dto.ServiceCategoryId);
            await EnsureServiceNameIsUniqueInCategoryAsync(dto.Name, dto.ServiceCategoryId, id);

            var service = await _serviceRepo.GetByIDAsync(id);
            if (service is null)
                throw new AppException("Resource not found.", 404);

            service.Name = dto.Name.Trim();
            service.Description = dto.Description?.Trim() ?? string.Empty;
            service.ServiceCategoryId = dto.ServiceCategoryId;
            service.IconUrl = dto.IconUrl?.Trim() ?? string.Empty;
            service.IsVisible = dto.IsVisible;
            service.UpdatedAt = DateTime.UtcNow;

            _serviceRepo.SaveInclude(
                service,
                nameof(service.Name),
                nameof(service.Description),
                nameof(service.ServiceCategoryId),
                nameof(service.IconUrl),
                nameof(service.IsVisible),
                nameof(service.UpdatedAt));

            await _serviceRepo.SaveChangesAsync();
            return await GetServiceByIdAsync(id);
        }

        public async Task<ServiceDto> SetServiceVisibilityAsync(int id, bool isVisible)
        {
            var service = await _serviceRepo.GetByIDAsync(id);
            if (service is null)
                throw new AppException("Resource not found.", 404);

            service.IsVisible = isVisible;
            service.UpdatedAt = DateTime.UtcNow;

            _serviceRepo.SaveInclude(service, nameof(service.IsVisible), nameof(service.UpdatedAt));
            await _serviceRepo.SaveChangesAsync();

            return await GetServiceByIdAsync(id);
        }

        public async Task DeleteServiceAsync(int id)
        {
            var service = await _serviceRepo.GetByIDAsync(id);
            if (service is null)
                throw new AppException("Resource not found.", 404);

            var hasRequests = await _serviceRequestRepo
                .GetAll(r => r.ServiceId == id)
                .AnyAsync();
            var hasPortfolioProjects = await _portfolioProjectRepo
                .GetAll(p => p.ServiceId == id)
                .AnyAsync();

            if (hasRequests || hasPortfolioProjects)
                throw new AppException("Invalid request.", 400);

            _serviceRepo.SoftDelete(service);
            await _serviceRepo.SaveChangesAsync();
        }

        private IQueryable<DomainService> BuildServiceQuery()
        {
            return _serviceRepo
                .Query()
                .Include(s => s.ServiceCategory);
        }

        private async Task EnsureServiceCategoryExistsAsync(int id)
        {
            if (id <= 0 || !await _serviceCategoryRepo.IsExistAsync(id))
                throw new AppException("Resource not found.", 404);
        }

        private async Task EnsureServiceCategoryNameIsUniqueAsync(string name, int? currentId = null)
        {
            var normalizedName = Normalize(name);
            var exists = await _serviceCategoryRepo
                .GetAll(c => c.Name.ToLower() == normalizedName && (!currentId.HasValue || c.Id != currentId.Value))
                .AnyAsync();

            if (exists)
                throw new AppException("Invalid request.", 400);
        }

        private async Task EnsureServiceNameIsUniqueInCategoryAsync(string name, int categoryId, int? currentId = null)
        {
            var normalizedName = Normalize(name);
            var exists = await _serviceRepo
                .GetAll(s =>
                    s.ServiceCategoryId == categoryId
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

        private static void ValidateServiceInput(string name, int categoryId)
        {
            if (string.IsNullOrWhiteSpace(name) || categoryId <= 0)
                throw new AppException("Invalid request.", 400);
        }

        private static string Normalize(string value)
            => value.Trim().ToLowerInvariant();

        private static IQueryable<ServiceCategory> ApplyCategorySorting(
            IQueryable<ServiceCategory> query,
            ServiceCategoryRequest request)
        {
            var isDescending = IsDescending(request.SortDirection);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "name" => isDescending ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name),
                "displayorder" => isDescending ? query.OrderByDescending(c => c.DisplayOrder) : query.OrderBy(c => c.DisplayOrder),
                "isactive" => isDescending ? query.OrderByDescending(c => c.IsActive) : query.OrderBy(c => c.IsActive),
                "servicescount" => isDescending ? query.OrderByDescending(c => c.Services.Count) : query.OrderBy(c => c.Services.Count),
                _ => isDescending ? query.OrderByDescending(c => c.Id) : query.OrderBy(c => c.Id)
            };
        }

        private static IQueryable<DomainService> ApplyServiceSorting(
            IQueryable<DomainService> query,
            ServiceFilterRequest request)
        {
            var isDescending = IsDescending(request.SortDirection);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "name" => isDescending ? query.OrderByDescending(s => s.Name) : query.OrderBy(s => s.Name),
                "servicecategoryid" => isDescending ? query.OrderByDescending(s => s.ServiceCategoryId) : query.OrderBy(s => s.ServiceCategoryId),
                "servicecategoryname" => isDescending ? query.OrderByDescending(s => s.ServiceCategory.Name) : query.OrderBy(s => s.ServiceCategory.Name),
                "isvisible" => isDescending ? query.OrderByDescending(s => s.IsVisible) : query.OrderBy(s => s.IsVisible),
                _ => isDescending ? query.OrderByDescending(s => s.Id) : query.OrderBy(s => s.Id)
            };
        }

        private static IQueryable<DomainService> ApplyPublicServiceSorting(
            IQueryable<DomainService> query,
            PublicServiceFilterRequest request)
        {
            var isDescending = IsDescending(request.SortDirection);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "name" => isDescending ? query.OrderByDescending(s => s.Name) : query.OrderBy(s => s.Name),
                "servicecategoryid" => isDescending ? query.OrderByDescending(s => s.ServiceCategoryId) : query.OrderBy(s => s.ServiceCategoryId),
                "servicecategoryname" => isDescending ? query.OrderByDescending(s => s.ServiceCategory.Name) : query.OrderBy(s => s.ServiceCategory.Name),
                "displayorder" => isDescending
                    ? query.OrderByDescending(s => s.ServiceCategory.DisplayOrder).ThenByDescending(s => s.Name)
                    : query.OrderBy(s => s.ServiceCategory.DisplayOrder).ThenBy(s => s.Name),
                _ => query.OrderBy(s => s.ServiceCategory.DisplayOrder).ThenBy(s => s.Name)
            };
        }

        private static bool IsDescending(string sortDirection)
            => !string.Equals(sortDirection, "ASC", StringComparison.OrdinalIgnoreCase);

        private static int GetPageIndex(ServiceCategoryRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageIndex(ServiceFilterRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageIndex(PublicServiceFilterRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(ServiceCategoryRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetPageSize(ServiceFilterRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetPageSize(PublicServiceFilterRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(ServiceCategoryRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private static int GetSkipCount(ServiceFilterRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private static int GetSkipCount(PublicServiceFilterRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private static ServiceCategoryDto MapCategory(ServiceCategory category)
        {
            return new ServiceCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                IconUrl = category.IconUrl,
                DisplayOrder = category.DisplayOrder,
                IsActive = category.IsActive,
                ServicesCount = category.Services.Count
            };
        }

        private static ServiceDto MapService(DomainService service)
        {
            return new ServiceDto
            {
                Id = service.Id,
                Name = service.Name,
                Description = service.Description,
                ServiceCategoryId = service.ServiceCategoryId,
                ServiceCategoryName = service.ServiceCategory?.Name ?? string.Empty,
                IconUrl = service.IconUrl,
                IsVisible = service.IsVisible
            };
        }
    }
}
