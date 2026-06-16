using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using TaskMangment.Application.Common.Responses;
using Client = OffshoreManagementSystem.Domain.Entities.Client;
using OffsureManagementSystem.Domain.Entities;
using ServiceRequest = OffshoreManagementSystem.Domain.Entities.ServiceRequest;
using User = OffshoreManagementSystem.Domain.Entities.User;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ClientManagementService : IClientManagementService
    {
        private readonly IRepository<Client> _clientRepo;
        private readonly IRepository<User> _userRepo;
        private readonly IRepository<Role> _roleRepo;
        private readonly IRepository<ServiceRequest> _serviceRequestRepo;

        public ClientManagementService(
            IRepository<Client> clientRepo,
            IRepository<User> userRepo,
            IRepository<Role> roleRepo,
            IRepository<ServiceRequest> serviceRequestRepo)
        {
            _clientRepo = clientRepo;
            _userRepo = userRepo;
            _roleRepo = roleRepo;
            _serviceRequestRepo = serviceRequestRepo;
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

        public async Task<ClientDto> CreateClientAsync(CreateClientDto dto)
        {
            ValidateCreateInput(dto);

            var normalizedEmail = NormalizeEmail(dto.Email);
            var emailExists = await _userRepo
                .GetAll(u => u.Email == normalizedEmail)
                .AnyAsync();

            if (emailExists)
                throw new AppException("Email already exists.", 400);

            var clientRole = await _roleRepo
                .GetAll(r => r.Name == "Client")
                .FirstOrDefaultAsync();

            if (clientRole is null)
                throw new AppException("Resource not found.", 404);

            var user = new User
            {
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = normalizedEmail,
                PasswordHash = HashPassword(dto.Password),
                RoleId = clientRole.Id,
                IsEmailVerified = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var client = new Client
            {
                User = user,
                CompanyName = dto.CompanyName.Trim(),
                ContactPersonPhone = dto.ContactPersonPhone?.Trim() ?? string.Empty,
                CompanyAddress = dto.CompanyAddress?.Trim() ?? string.Empty,
                City = dto.City?.Trim() ?? string.Empty,
                Country = dto.Country?.Trim() ?? string.Empty,
                PostalCode = dto.PostalCode?.Trim() ?? string.Empty,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _clientRepo.AddAsync(client);
            await _clientRepo.SaveChangesAsync();

            return await GetClientByIdAsync(client.Id);
        }

        public async Task<ClientDto> GetClientByIdAsync(int id)
        {
            var client = await BuildClientProfileQuery()
                .FirstOrDefaultAsync(c => c.Id == id);

            if (client is null)
                throw new AppException("Resource not found.", 404);

            return await MapClientProfileAsync(client);
        }

        public async Task<ClientDto> GetClientProfileAsync(int userId)
        {
            var client = await BuildClientProfileQuery()
                .FirstOrDefaultAsync(c => c.UserId == userId && !c.IsDeleted);

            if (client is null)
                throw new AppException("Client profile not found for current user.", 404);

            if (!client.IsActive)
                throw new AppException("Client profile is inactive.", 403);

            return await MapClientProfileAsync(client);
        }

        public async Task<IReadOnlyList<ClientServiceRequestSummaryDto>> GetClientRecentServiceRequestsAsync(
            int userId,
            int limit = 5)
        {
            var clientId = await _clientRepo
                .Query()
                .Where(c => c.UserId == userId && c.IsActive && !c.IsDeleted)
                .Select(c => c.Id)
                .FirstOrDefaultAsync();

            if (clientId == 0)
                throw new AppException("Client profile not found for current user.", 404);

            return await GetClientRecentServiceRequestsByClientIdAsync(clientId, limit);
        }

        public async Task<IReadOnlyList<ClientServiceRequestSummaryDto>> GetClientRecentServiceRequestsByClientIdAsync(
            int clientId,
            int limit = 5)
        {
            limit = NormalizeRecentRequestsLimit(limit);

            var clientExists = await _clientRepo
                .Query()
                .AnyAsync(c => c.Id == clientId);

            if (!clientExists)
                throw new AppException("Resource not found.", 404);

            var requests = await _serviceRequestRepo
                .Query()
                .Include(r => r.Service)
                .Include(r => r.Project)
                .Where(r => r.ClientId == clientId)
                .OrderByDescending(r => r.RequestedDate)
                .Take(limit)
                .ToListAsync();

            return requests.Select(MapRequest).ToList();
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
            var client = await _clientRepo
                .Query()
                .Include(c => c.ServiceRequests)
                    .ThenInclude(r => r.Project)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (client is null)
                throw new AppException("Resource not found.", 404);

            if (!client.IsActive)
                throw new AppException("Client is already inactive.", 400);

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

        private IQueryable<Client> BuildClientProfileQuery()
        {
            return _clientRepo
                .Query()
                .Include(c => c.User);
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

        private static void ValidateCreateInput(CreateClientDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FirstName)
                || string.IsNullOrWhiteSpace(dto.LastName)
                || string.IsNullOrWhiteSpace(dto.Email)
                || !dto.Email.Contains('@')
                || string.IsNullOrWhiteSpace(dto.Password)
                || dto.Password.Length < 8
                || string.IsNullOrWhiteSpace(dto.CompanyName))
            {
                throw new AppException("Invalid request.", 400);
            }
        }

        private static void ValidateProfileInput(UpdateClientProfileDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CompanyName))
                throw new AppException("Invalid request.", 400);
        }

        private static string NormalizeEmail(string email)
            => email.Trim().ToLowerInvariant();

        private static string HashPassword(string password)
            => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

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

        private static int NormalizeRecentRequestsLimit(int limit)
        {
            if (limit < 1)
                return 5;
            if (limit > 50)
                return 50;
            return limit;
        }

        private static ClientDto MapClient(Client client)
        {
            var requests = client.ServiceRequests
                .OrderByDescending(r => r.RequestedDate)
                .Select(MapRequest)
                .ToList();

            return MapClientCore(client, requests.Count, requests.Count(r => r.ProjectId.HasValue), requests);
        }

        private async Task<ClientDto> MapClientProfileAsync(Client client)
        {
            var requestQuery = _serviceRequestRepo.Query().Where(r => r.ClientId == client.Id);
            var requestsCount = await requestQuery.CountAsync();
            var projectsCount = await requestQuery.CountAsync(r => r.Project != null);

            return MapClientCore(client, requestsCount, projectsCount, new List<ClientServiceRequestSummaryDto>());
        }

        private static ClientDto MapClientCore(
            Client client,
            int requestsCount,
            int projectsCount,
            List<ClientServiceRequestSummaryDto> serviceRequests)
        {
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
                RequestsCount = requestsCount,
                ProjectsCount = projectsCount,
                ServiceRequests = serviceRequests
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
