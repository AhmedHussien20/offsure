using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.PortfolioManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using TaskMangment.Application.Common.Responses;
using DomainService = OffshoreManagementSystem.Domain.Entities.Service;
using PortfolioProject = OffshoreManagementSystem.Domain.Entities.PortfolioProject;
using PortfolioProjectImage = OffshoreManagementSystem.Domain.Entities.PortfolioProjectImage;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class PortfolioManagementService : IPortfolioManagementService
    {
        private readonly IRepository<PortfolioProject> _portfolioRepo;
        private readonly IRepository<PortfolioProjectImage> _portfolioImageRepo;
        private readonly IRepository<DomainService> _serviceRepo;
        private readonly string _imageRootPath;

        public PortfolioManagementService(
            IRepository<PortfolioProject> portfolioRepo,
            IRepository<PortfolioProjectImage> portfolioImageRepo,
            IRepository<DomainService> serviceRepo,
            IConfiguration configuration)
        {
            _portfolioRepo = portfolioRepo;
            _portfolioImageRepo = portfolioImageRepo;
            _serviceRepo = serviceRepo;
            _imageRootPath = configuration[PortfolioImageRootConfigKey]
                ?? throw new InvalidOperationException(
                    $"Missing configuration key '{PortfolioImageRootConfigKey}'. Ensure LocalStorageBootstrap runs at startup.");
        }

        private const string PortfolioImageRootConfigKey = "Storage:PortfolioImageRoot";

        public async Task<PagedResponse<PortfolioDto>> GetAllPortfoliosAsync(PortfolioFilterRequest request)
        {
            var query = BuildPortfolioListQuery();

            if (!request.IncludeUnpublished)
                query = query.Where(p => p.IsPublished);

            query = ApplyFilters(query, request);

            var totalCount = await query.CountAsync();
            var portfolios = await ApplySorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            // Public lists hide inactive gallery images; admin (IncludeUnpublished) sees all.
            var publicView = !request.IncludeUnpublished;

            return new PagedResponse<PortfolioDto>(
                portfolios.Select(p => MapPortfolio(p, publicView)).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<List<PortfolioServiceSummaryDto>> GetServiceProjectSummaryAsync()
        {
            // Count all portfolio projects for the service (published and unpublished).
            return await _portfolioRepo
                .Query()
                .AsNoTracking()
                .Where(p => !p.IsDeleted && p.Service != null && !p.Service.IsDeleted)
                .GroupBy(p => new
                {
                    p.ServiceId,
                    ServiceName = p.Service.Name,
                    CategoryName = p.Service.ServiceCategory != null
                        ? p.Service.ServiceCategory.Name
                        : string.Empty
                })
                .Select(g => new PortfolioServiceSummaryDto
                {
                    ServiceId = g.Key.ServiceId,
                    ServiceName = g.Key.ServiceName,
                    ServiceCategoryName = g.Key.CategoryName,
                    ProjectCount = g.Count()
                })
                .Where(s => s.ProjectCount > 0)
                .OrderBy(s => s.ServiceName)
                .ToListAsync();
        }

        public async Task<PortfolioDto> GetPortfolioByIdAsync(int id, bool includeUnpublished = false)
        {
            var query = BuildPortfolioQuery().Where(p => p.Id == id);

            if (!includeUnpublished)
                query = query.Where(p => p.IsPublished);

            var portfolio = await query.FirstOrDefaultAsync();

            if (portfolio is null)
                throw new AppException("Resource not found.", 404);

            return MapPortfolio(portfolio, publicView: !includeUnpublished);
        }

        public async Task<PortfolioDto> AddPortfolioAsync(AddPortfolioDto dto)
        {
            ValidateAddPortfolioInput(dto);
            await EnsureServiceExistsAsync(dto.ServiceId);

            var portfolio = new PortfolioProject
            {
                ServiceId = dto.ServiceId,
                Title = dto.Title.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                ClientName = dto.ClientName.Trim(),
                ThumbnailUrl = dto.ThumbnailUrl?.Trim() ?? string.Empty,
                CompletedDate = dto.CompletedDate,
                IsPublished = dto.IsPublished,
                CreatedAt = DateTime.UtcNow,
                PortfolioProjectImages = dto.Images
                    .Where(i => !string.IsNullOrWhiteSpace(i.ImageUrl))
                    .Select(i => new PortfolioProjectImage
                    {
                        ImageUrl = i.ImageUrl.Trim(),
                        ImageAltText = i.ImageAltText?.Trim() ?? string.Empty,
                        DisplayOrder = i.DisplayOrder,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    })
                    .ToList()
            };

            await _portfolioRepo.AddAsync(portfolio);
            await _portfolioRepo.SaveChangesAsync();

            return await GetPortfolioForAdminByIdAsync(portfolio.Id);
        }

        public async Task<PortfolioDto> UpdatePortfolioAsync(int id, UpdatePortfolioDto dto)
        {
            ValidateUpdatePortfolioInput(dto);

            var portfolio = await _portfolioRepo.GetByIDAsync(id);
            if (portfolio is null)
                throw new AppException("Resource not found.", 404);

            portfolio.Title = dto.Title.Trim();
            portfolio.Description = dto.Description?.Trim() ?? string.Empty;
            portfolio.ClientName = dto.ClientName.Trim();
            portfolio.ThumbnailUrl = dto.ThumbnailUrl?.Trim() ?? string.Empty;
            portfolio.CompletedDate = dto.CompletedDate;
            portfolio.IsPublished = dto.IsPublished;
            portfolio.UpdatedAt = DateTime.UtcNow;

            _portfolioRepo.SaveInclude(
                portfolio,
                nameof(portfolio.Title),
                nameof(portfolio.Description),
                nameof(portfolio.ClientName),
                nameof(portfolio.ThumbnailUrl),
                nameof(portfolio.CompletedDate),
                nameof(portfolio.IsPublished),
                nameof(portfolio.UpdatedAt));
            await _portfolioRepo.SaveChangesAsync();

            return await GetPortfolioForAdminByIdAsync(id);
        }

        public async Task DeletePortfolioAsync(int id)
        {
            var portfolio = await _portfolioRepo
                .Query()
                .Include(p => p.PortfolioProjectImages)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (portfolio is null)
                throw new AppException("Resource not found.", 404);

            foreach (var image in portfolio.PortfolioProjectImages)
                _portfolioImageRepo.SoftDelete(image);

            _portfolioRepo.SoftDelete(portfolio);
            await _portfolioRepo.SaveChangesAsync();
        }

        public async Task<PortfolioDto> UploadImageAsync(
            int portfolioId,
            Stream content,
            string fileName,
            string? imageAltText,
            int displayOrder)
        {
            await EnsurePortfolioExistsAsync(portfolioId);

            if ((content.CanSeek && content.Length == 0) || string.IsNullOrWhiteSpace(fileName))
                throw new AppException("Invalid request.", 400);

            var imagePath = await SaveImageAsync(portfolioId, fileName, content);

            var image = new PortfolioProjectImage
            {
                PortfolioProjectId = portfolioId,
                ImageUrl = imagePath,
                ImageAltText = imageAltText?.Trim() ?? string.Empty,
                DisplayOrder = displayOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _portfolioImageRepo.AddAsync(image);
            await _portfolioImageRepo.SaveChangesAsync();

            return await GetPortfolioForAdminByIdAsync(portfolioId);
        }

        public async Task<PortfolioDto> LinkToServiceAsync(int portfolioId, int serviceId)
        {
            await EnsureServiceExistsAsync(serviceId);

            var portfolio = await _portfolioRepo.GetByIDAsync(portfolioId);
            if (portfolio is null)
                throw new AppException("Resource not found.", 404);

            portfolio.ServiceId = serviceId;
            portfolio.UpdatedAt = DateTime.UtcNow;

            _portfolioRepo.SaveInclude(
                portfolio,
                nameof(portfolio.ServiceId),
                nameof(portfolio.UpdatedAt));
            await _portfolioRepo.SaveChangesAsync();

            return await GetPortfolioForAdminByIdAsync(portfolioId);
        }

        public async Task<PortfolioDto> SetImageActiveAsync(int portfolioId, int imageId, bool isActive)
        {
            await EnsurePortfolioExistsAsync(portfolioId);

            var image = await _portfolioImageRepo.GetByIDAsync(imageId);
            if (image is null || image.PortfolioProjectId != portfolioId)
                throw new AppException("Resource not found.", 404);

            image.IsActive = isActive;
            image.UpdatedAt = DateTime.UtcNow;

            _portfolioImageRepo.SaveInclude(
                image,
                nameof(image.IsActive),
                nameof(image.UpdatedAt));
            await _portfolioImageRepo.SaveChangesAsync();

            return await GetPortfolioForAdminByIdAsync(portfolioId);
        }

        private async Task<PortfolioDto> GetPortfolioForAdminByIdAsync(int id)
        {
            var portfolio = await BuildPortfolioQuery()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (portfolio is null)
                throw new AppException("Resource not found.", 404);

            return MapPortfolio(portfolio, publicView: false);
        }

        private IQueryable<PortfolioProject> BuildPortfolioListQuery()
            => BuildPortfolioQuery();

        private IQueryable<PortfolioProject> BuildPortfolioQuery()
        {
            return _portfolioRepo
                .Query()
                .Include(p => p.Service)
                    .ThenInclude(s => s.ServiceCategory)
                .Include(p => p.PortfolioProjectImages);
        }

        private static IQueryable<PortfolioProject> ApplyFilters(
            IQueryable<PortfolioProject> query,
            PortfolioFilterRequest request)
        {
            if (request.Id.HasValue)
                query = query.Where(p => p.Id == request.Id.Value);

            if (request.ServiceId.HasValue)
                query = query.Where(p => p.ServiceId == request.ServiceId.Value);

            if (request.CompletedFrom.HasValue)
                query = query.Where(p => p.CompletedDate >= request.CompletedFrom.Value);

            if (request.CompletedTo.HasValue)
                query = query.Where(p => p.CompletedDate <= request.CompletedTo.Value);

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(p =>
                    p.Title.ToLower().Contains(searchKey)
                    || p.Description.ToLower().Contains(searchKey)
                    || p.ClientName.ToLower().Contains(searchKey)
                    || p.Service.Name.ToLower().Contains(searchKey)
                    || p.Service.ServiceCategory.Name.ToLower().Contains(searchKey));
            }

            return query;
        }

        private static IQueryable<PortfolioProject> ApplySorting(
            IQueryable<PortfolioProject> query,
            PortfolioFilterRequest request)
        {
            var isDescending = IsDescending(request.SortDirection);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "title" => isDescending ? query.OrderByDescending(p => p.Title) : query.OrderBy(p => p.Title),
                "clientname" => isDescending ? query.OrderByDescending(p => p.ClientName) : query.OrderBy(p => p.ClientName),
                "servicename" => isDescending ? query.OrderByDescending(p => p.Service.Name) : query.OrderBy(p => p.Service.Name),
                "completeddate" => isDescending ? query.OrderByDescending(p => p.CompletedDate) : query.OrderBy(p => p.CompletedDate),
                _ => isDescending ? query.OrderByDescending(p => p.CompletedDate) : query.OrderBy(p => p.CompletedDate)
            };
        }

        private async Task EnsureServiceExistsAsync(int serviceId)
        {
            if (serviceId <= 0 || !await _serviceRepo.IsExistAsync(serviceId))
                throw new AppException("Resource not found.", 404);
        }

        private async Task EnsurePortfolioExistsAsync(int portfolioId)
        {
            if (portfolioId <= 0 || !await _portfolioRepo.IsExistAsync(portfolioId))
                throw new AppException("Resource not found.", 404);
        }

        private async Task<string> SaveImageAsync(int portfolioId, string fileName, Stream content)
        {
            Directory.CreateDirectory(_imageRootPath);

            var extension = Path.GetExtension(fileName);
            var safeFileName = $"{portfolioId}-{Guid.NewGuid():N}{extension}";
            var path = Path.Combine(_imageRootPath, safeFileName);

            await using var output = File.Create(path);
            await content.CopyToAsync(output);

            return safeFileName;
        }

        private static void ValidateAddPortfolioInput(AddPortfolioDto dto)
        {
            if (dto.ServiceId <= 0
                || string.IsNullOrWhiteSpace(dto.Title)
                || string.IsNullOrWhiteSpace(dto.ClientName)
                || dto.CompletedDate == default)
            {
                throw new AppException("Invalid request.", 400);
            }
        }

        private static void ValidateUpdatePortfolioInput(UpdatePortfolioDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title)
                || string.IsNullOrWhiteSpace(dto.ClientName)
                || dto.CompletedDate == default)
            {
                throw new AppException("Invalid request.", 400);
            }
        }

        private static string Normalize(string value)
            => value.Trim().ToLowerInvariant();

        private static bool IsDescending(string sortDirection)
            => !string.Equals(sortDirection, "ASC", StringComparison.OrdinalIgnoreCase);

        private static int GetPageIndex(PortfolioFilterRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(PortfolioFilterRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(PortfolioFilterRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private static PortfolioDto MapPortfolio(PortfolioProject portfolio, bool publicView)
        {
            var images = (portfolio.PortfolioProjectImages ?? Enumerable.Empty<PortfolioProjectImage>())
                .Where(i => !i.IsDeleted)
                .OrderBy(i => i.DisplayOrder)
                .AsEnumerable();

            if (publicView)
                images = images.Where(i => i.IsActive);

            return new PortfolioDto
            {
                Id = portfolio.Id,
                ServiceId = portfolio.ServiceId,
                ServiceName = portfolio.Service?.Name ?? string.Empty,
                ServiceCategoryName = portfolio.Service?.ServiceCategory?.Name ?? string.Empty,
                Title = portfolio.Title,
                Description = portfolio.Description,
                ClientName = portfolio.ClientName,
                ThumbnailUrl = portfolio.ThumbnailUrl,
                CompletedDate = portfolio.CompletedDate,
                IsPublished = portfolio.IsPublished,
                Images = images.Select(MapImage).ToList()
            };
        }

        private static PortfolioImageDto MapImage(PortfolioProjectImage image)
        {
            return new PortfolioImageDto
            {
                Id = image.Id,
                ImageUrl = ToPublicImageUrl(image.ImageUrl),
                ImageAltText = image.ImageAltText,
                DisplayOrder = image.DisplayOrder,
                IsActive = image.IsActive
            };
        }

        private static string ToPublicImageUrl(string storedValue)
        {
            if (string.IsNullOrWhiteSpace(storedValue))
                return string.Empty;

            var fileName = Path.GetFileName(storedValue.Trim());
            return string.IsNullOrEmpty(fileName)
                ? string.Empty
                : $"/portfolio-images/{fileName}";
        }
    }
}
