using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using TaskMangment.Application.Common.Responses;
using Client = OffshoreManagementSystem.Domain.Entities.Client;
using ServiceRequest = OffshoreManagementSystem.Domain.Entities.ServiceRequest;
using User = OffshoreManagementSystem.Domain.Entities.User;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ClientManagementService : IClientManagementService
    {
        private readonly IRepository<Client> _clientRepo;
        private readonly IRepository<User> _userRepo;

        public ClientManagementService(
            IRepository<Client> clientRepo,
            IRepository<User> userRepo)
        {
            _clientRepo = clientRepo;
            _userRepo = userRepo;
        }

        public async Task<PagedResponse<ClientDto>> GetAllClientsAsync(ClientFilterRequest request)
        {
            var query = BuildClientQuery();
            query = ApplyFilters(query, request);

            var totalCount = await query.CountAsync();
            var clients = await ApplySorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<ClientDto>(
                clients.Select(MapClient).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<ClientDto> GetClientByIdAsync(int id)
        {
            var client = await BuildClientQuery()
                .FirstOrDefaultAsync(c => c.Id == id);

            if (client is null)
                throw new AppException("Resource not found.", 404);

            return MapClient(client);
        }

        public async Task<ClientDto> GetClientProfileAsync(int userId)
        {
            var client = await BuildClientQuery()
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (client is null)
                throw new AppException("Client profile not found for current user.", 404);

            return MapClient(client);
        }

        public async Task<ClientDto> UpdateClientProfileAsync(int userId, UpdateClientProfileDto dto)
        {
            ValidateProfileInput(dto);

            var client = await _clientRepo
                .Query()
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (client is null)
                throw new AppException("Client profile not found for current user.", 404);

            if (!client.IsActive)
                throw new AppException("Client profile is inactive.", 400);

            client.CompanyName = dto.CompanyName.Trim();
            client.ContactPersonPhone = dto.ContactPersonPhone?.Trim() ?? string.Empty;
            client.CompanyAddress = dto.CompanyAddress?.Trim() ?? string.Empty;
            client.City = dto.City?.Trim() ?? string.Empty;
            client.Country = dto.Country?.Trim() ?? string.Empty;
            client.PostalCode = dto.PostalCode?.Trim() ?? string.Empty;
            client.UpdatedAt = DateTime.UtcNow;

            _clientRepo.SaveInclude(
                client,
                nameof(client.CompanyName),
                nameof(client.ContactPersonPhone),
                nameof(client.CompanyAddress),
                nameof(client.City),
                nameof(client.Country),
                nameof(client.PostalCode),
                nameof(client.UpdatedAt));
            await _clientRepo.SaveChangesAsync();

            return await GetClientProfileAsync(userId);
        }

        public async Task<ClientDto> DeactivateClientAsync(int id)
        {
            var client = await _clientRepo.GetByIDAsync(id);
            if (client is null)
                throw new AppException("Resource not found.", 404);

            client.IsActive = false;
            client.UpdatedAt = DateTime.UtcNow;

            _clientRepo.SaveInclude(
                client,
                nameof(client.IsActive),
                nameof(client.UpdatedAt));

            var user = await _userRepo.GetByIDAsync(client.UserId);
            if (user is not null)
            {
                user.IsActive = false;
                user.RefreshToken = null;
                user.RefreshTokenExpiry = null;
                user.UpdatedAt = DateTime.UtcNow;

                _userRepo.SaveInclude(
                    user,
                    nameof(user.IsActive),
                    nameof(user.RefreshToken),
                    nameof(user.RefreshTokenExpiry),
                    nameof(user.UpdatedAt));
            }

            await _clientRepo.SaveChangesAsync();

            return await GetClientByIdAsync(id);
        }

        private IQueryable<Client> BuildClientQuery()
        {
            return _clientRepo
                .Query()
                .Include(c => c.User)
                .Include(c => c.ServiceRequests)
                    .ThenInclude(r => r.Service)
                .Include(c => c.ServiceRequests)
                    .ThenInclude(r => r.Project);
        }

        private static IQueryable<Client> ApplyFilters(
            IQueryable<Client> query,
            ClientFilterRequest request)
        {
            if (request.Id.HasValue)
                query = query.Where(c => c.Id == request.Id.Value);

            if (request.UserId.HasValue)
                query = query.Where(c => c.UserId == request.UserId.Value);

            if (request.IsActive.HasValue)
                query = query.Where(c => c.IsActive == request.IsActive.Value);

            if (!string.IsNullOrWhiteSpace(request.City))
            {
                var city = Normalize(request.City);
                query = query.Where(c => (c.City ?? string.Empty).ToLower().Contains(city));
            }

            if (!string.IsNullOrWhiteSpace(request.Country))
            {
                var country = Normalize(request.Country);
                query = query.Where(c => (c.Country ?? string.Empty).ToLower().Contains(country));
            }

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(c =>
                    c.CompanyName.ToLower().Contains(searchKey)
                    || (c.ContactPersonPhone ?? string.Empty).ToLower().Contains(searchKey)
                    || (c.CompanyAddress ?? string.Empty).ToLower().Contains(searchKey)
                    || (c.City ?? string.Empty).ToLower().Contains(searchKey)
                    || (c.Country ?? string.Empty).ToLower().Contains(searchKey)
                    || c.User.FirstName.ToLower().Contains(searchKey)
                    || c.User.LastName.ToLower().Contains(searchKey)
                    || c.User.Email.ToLower().Contains(searchKey));
            }

            return query;
        }

        private static IQueryable<Client> ApplySorting(
            IQueryable<Client> query,
            ClientFilterRequest request)
        {
            var isDescending = IsDescending(request.SortDirection);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "companyname" => isDescending ? query.OrderByDescending(c => c.CompanyName) : query.OrderBy(c => c.CompanyName),
                "firstname" => isDescending ? query.OrderByDescending(c => c.User.FirstName) : query.OrderBy(c => c.User.FirstName),
                "lastname" => isDescending ? query.OrderByDescending(c => c.User.LastName) : query.OrderBy(c => c.User.LastName),
                "email" => isDescending ? query.OrderByDescending(c => c.User.Email) : query.OrderBy(c => c.User.Email),
                "city" => isDescending ? query.OrderByDescending(c => c.City) : query.OrderBy(c => c.City),
                "country" => isDescending ? query.OrderByDescending(c => c.Country) : query.OrderBy(c => c.Country),
                "isactive" => isDescending ? query.OrderByDescending(c => c.IsActive) : query.OrderBy(c => c.IsActive),
                "requestscount" => isDescending ? query.OrderByDescending(c => c.ServiceRequests.Count) : query.OrderBy(c => c.ServiceRequests.Count),
                _ => isDescending ? query.OrderByDescending(c => c.Id) : query.OrderBy(c => c.Id)
            };
        }

        private static void ValidateProfileInput(UpdateClientProfileDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CompanyName))
                throw new AppException("Invalid request.", 400);
        }

        private static string Normalize(string value)
            => value.Trim().ToLowerInvariant();

        private static bool IsDescending(string sortDirection)
            => !string.Equals(sortDirection, "ASC", StringComparison.OrdinalIgnoreCase);

        private static int GetPageIndex(ClientFilterRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(ClientFilterRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(ClientFilterRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private static ClientDto MapClient(Client client)
        {
            var requests = client.ServiceRequests
                .OrderByDescending(r => r.RequestedDate)
                .Select(MapRequest)
                .ToList();

            return new ClientDto
            {
                Id = client.Id,
                UserId = client.UserId,
                FirstName = client.User?.FirstName ?? string.Empty,
                LastName = client.User?.LastName ?? string.Empty,
                Email = client.User?.Email ?? string.Empty,
                IsUserActive = client.User?.IsActive ?? false,
                IsEmailVerified = client.User?.IsEmailVerified ?? false,
                CompanyName = client.CompanyName ?? string.Empty,
                ContactPersonPhone = client.ContactPersonPhone ?? string.Empty,
                CompanyAddress = client.CompanyAddress ?? string.Empty,
                City = client.City ?? string.Empty,
                Country = client.Country ?? string.Empty,
                PostalCode = client.PostalCode ?? string.Empty,
                IsActive = client.IsActive,
                RequestsCount = requests.Count,
                ProjectsCount = requests.Count(r => r.ProjectId.HasValue),
                ServiceRequests = requests
            };
        }

        private static ClientServiceRequestSummaryDto MapRequest(ServiceRequest request)
        {
            return new ClientServiceRequestSummaryDto
            {
                Id = request.Id,
                ServiceId = request.ServiceId,
                ServiceName = request.Service?.Name ?? string.Empty,
                Title = request.Title,
                Status = request.Status,
                RequestedDate = request.RequestedDate,
                ProjectId = request.Project?.Id,
                ProjectName = request.Project?.Name ?? string.Empty,
                ProjectStatus = request.Project?.Status
            };
        }
    }
}
