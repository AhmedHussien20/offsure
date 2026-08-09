using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.Common.Requests;
using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities.Enum;
using TaskMangment.Application.Common.Responses;
using Client = OffshoreManagementSystem.Domain.Entities.Client;
using OffsureManagementSystem.Domain.Entities;
using Project = OffshoreManagementSystem.Domain.Entities.Project;
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
        private readonly IRepository<Project> _projectRepo;
        private readonly IClientAccessService _clientAccess;

        public ClientManagementService(
            IRepository<Client> clientRepo,
            IRepository<User> userRepo,
            IRepository<Role> roleRepo,
            IRepository<ServiceRequest> serviceRequestRepo,
            IRepository<Project> projectRepo,
            IClientAccessService clientAccess)
        {
            _clientRepo = clientRepo;
            _userRepo = userRepo;
            _roleRepo = roleRepo;
            _serviceRequestRepo = serviceRequestRepo;
            _projectRepo = projectRepo;
            _clientAccess = clientAccess;
        }

        public async Task<PagedResponse<ClientDto>> GetAllClientsAsync(ClientFilterRequest request)
        {
            var query = BuildClientListQuery();
            query = ApplyFilters(query, request);

            var totalCount = await query.CountAsync();
            var clients = await ApplySorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            var clientIds = clients.Select(c => c.Id).ToList();
            var ownerIds = clients
                .Where(c => c.AccountRole == ClientAccountRole.Owner)
                .Select(c => c.Id)
                .ToList();

            // Company browse (owners only): owner total includes owner + member requests.
            // Members / mixed lists: each client gets only their own request count.
            Dictionary<int, int> requestCounts;
            if (clientIds.Count == 0)
            {
                requestCounts = new Dictionary<int, int>();
            }
            else if (request.OwnersOnly != false)
            {
                requestCounts = await _serviceRequestRepo
                    .Query()
                    .Where(r =>
                        !r.IsDeleted
                        && (clientIds.Contains(r.ClientId)
                            || (r.Client.ParentClientId != null
                                && ownerIds.Contains(r.Client.ParentClientId.Value))))
                    .GroupBy(r => r.Client.ParentClientId ?? r.ClientId)
                    .Select(g => new { ClientId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.ClientId, x => x.Count);
            }
            else
            {
                requestCounts = await _serviceRequestRepo
                    .Query()
                    .Where(r => !r.IsDeleted && clientIds.Contains(r.ClientId))
                    .GroupBy(r => r.ClientId)
                    .Select(g => new { ClientId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.ClientId, x => x.Count);
            }

            var memberCounts = ownerIds.Count == 0
                ? new Dictionary<int, int>()
                : await _clientRepo
                    .Query()
                    .Where(c =>
                        c.ParentClientId != null
                        && ownerIds.Contains(c.ParentClientId.Value)
                        && c.AccountRole == ClientAccountRole.Member
                        && !c.IsDeleted)
                    .GroupBy(c => c.ParentClientId!.Value)
                    .Select(g => new { OwnerId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.OwnerId, x => x.Count);

            return new PagedResponse<ClientDto>(
                clients.Select(c => MapClientList(
                    c,
                    requestCounts.GetValueOrDefault(c.Id),
                    memberCounts.GetValueOrDefault(c.Id))).ToList(),
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
                AccountRole = ClientAccountRole.Owner,
                ParentClientId = null,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _clientRepo.AddAsync(client);
            await _clientRepo.SaveChangesAsync();

            return await GetClientByIdAsync(client.Id);
        }

        public async Task<ClientDto> CreateOrganizationMemberAsync(int ownerClientId, CreateClientMemberDto dto)
        {
            ValidateMemberCreateInput(dto);

            var owner = await _clientRepo
                .Query()
                .FirstOrDefaultAsync(c =>
                    c.Id == ownerClientId
                    && !c.IsDeleted
                    && c.AccountRole == ClientAccountRole.Owner
                    && c.ParentClientId == null);

            if (owner is null)
                throw new AppException("Organization owner client not found.", 404);

            if (!owner.IsActive)
                throw new AppException("Cannot add users to an inactive organization.", 400);

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

            var member = new Client
            {
                User = user,
                CompanyName = owner.CompanyName,
                ContactPersonPhone = dto.ContactPersonPhone?.Trim() ?? string.Empty,
                CompanyAddress = owner.CompanyAddress ?? string.Empty,
                City = owner.City ?? string.Empty,
                Country = owner.Country ?? string.Empty,
                PostalCode = owner.PostalCode ?? string.Empty,
                SalesId = owner.SalesId,
                AccountRole = ClientAccountRole.Member,
                ParentClientId = owner.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _clientRepo.AddAsync(member);
            await _clientRepo.SaveChangesAsync();

            return await GetClientByIdAsync(member.Id);
        }

        public async Task<IReadOnlyList<ClientDto>> GetOrganizationMembersAsync(int ownerClientId)
        {
            var ownerExists = await _clientRepo
                .Query()
                .AnyAsync(c =>
                    c.Id == ownerClientId
                    && !c.IsDeleted
                    && c.AccountRole == ClientAccountRole.Owner);

            if (!ownerExists)
                throw new AppException("Organization owner client not found.", 404);

            return await LoadOrganizationMembersAsync(ownerClientId);
        }

        public async Task<PagedResponse<ClientDto>> GetMyOrganizationMembersAsync(
            int userId,
            BaseApiRequest request)
        {
            var owner = await _clientRepo
                .Query()
                .AsNoTracking()
                .Where(c => c.UserId == userId && !c.IsDeleted)
                .Select(c => new { c.Id, c.AccountRole, c.IsActive })
                .FirstOrDefaultAsync();

            if (owner is null)
                throw new AppException("Client profile not found for current user.", 404);

            if (!owner.IsActive)
                throw new AppException("Client profile is inactive.", 403);

            if (owner.AccountRole != ClientAccountRole.Owner)
                throw new AppException("Only organization owners can view company members.", 403);

            return await LoadOrganizationMembersPagedAsync(owner.Id, request);
        }

        private async Task<IReadOnlyList<ClientDto>> LoadOrganizationMembersAsync(int ownerClientId)
        {
            var members = await BuildOrganizationMembersQuery(ownerClientId)
                .OrderBy(c => c.User.FirstName)
                .ThenBy(c => c.User.LastName)
                .ToListAsync();

            var result = new List<ClientDto>(members.Count);
            foreach (var member in members)
                result.Add(await MapClientProfileAsync(member));

            return result;
        }

        private async Task<PagedResponse<ClientDto>> LoadOrganizationMembersPagedAsync(
            int ownerClientId,
            BaseApiRequest request)
        {
            var pageIndex = request.PageIndex < 1 ? 1 : request.PageIndex;
            var pageSize = request.PageSize < 1 ? 12 : request.PageSize;

            var query = BuildOrganizationMembersQuery(ownerClientId);

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(c =>
                    (c.ContactPersonPhone ?? string.Empty).ToLower().Contains(searchKey)
                    || c.User.FirstName.ToLower().Contains(searchKey)
                    || c.User.LastName.ToLower().Contains(searchKey)
                    || c.User.Email.ToLower().Contains(searchKey)
                    || (c.User.FirstName + " " + c.User.LastName).ToLower().Contains(searchKey));
            }

            var totalCount = await query.CountAsync();
            var members = await query
                .OrderBy(c => c.User.FirstName)
                .ThenBy(c => c.User.LastName)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new List<ClientDto>(members.Count);
            foreach (var member in members)
                result.Add(await MapClientProfileAsync(member));

            return new PagedResponse<ClientDto>(result, totalCount, pageIndex, pageSize);
        }

        private IQueryable<Client> BuildOrganizationMembersQuery(int ownerClientId)
        {
            return _clientRepo
                .Query()
                .Include(c => c.User)
                .Include(c => c.SalesUser)
                .Where(c =>
                    c.ParentClientId == ownerClientId
                    && c.AccountRole == ClientAccountRole.Member
                    && !c.IsDeleted);
        }

        public async Task<ClientDto> CreateClientBySalesAsync(int salesUserId, CreateClientDto dto)
        {
            ValidateCreateInput(dto);

            var salesUser = await _userRepo
                .Query()
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u =>
                    u.Id == salesUserId
                    && u.IsActive
                    && !u.IsDeleted
                    && u.Role.Name == nameof(Domain.Entities.Enum.UserRole.Sales));

            if (salesUser is null)
                throw new AppException("Sales profile not found for current user.", 404);

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
                SalesId = salesUserId,
                AccountRole = ClientAccountRole.Owner,
                ParentClientId = null,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _clientRepo.AddAsync(client);
            await _clientRepo.SaveChangesAsync();

            return await GetClientByIdAsync(client.Id);
        }

        public async Task<PagedResponse<ClientDto>> GetClientsBySalesUserAsync(
            int salesUserId,
            ClientFilterRequest request)
        {
            request.SalesId = salesUserId;
            return await GetAllClientsAsync(request);
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
            limit = NormalizeRecentRequestsLimit(limit);
            var clientIds = await _clientAccess.GetAccessibleClientIdsForUserAsync(userId);

            var requests = await _serviceRequestRepo
                .Query()
                .Include(r => r.Service)
                .Include(r => r.Project)
                .Where(r => clientIds.Contains(r.ClientId))
                .OrderByDescending(r => r.RequestedDate)
                .Take(limit)
                .ToListAsync();

            return requests.Select(MapRequest).ToList();
        }

        public async Task<IReadOnlyList<ClientServiceRequestSummaryDto>> GetClientRecentServiceRequestsByClientIdAsync(
            int clientId,
            int limit = 5)
        {
            limit = NormalizeRecentRequestsLimit(limit);

            var orgClientIds = await GetOrganizationClientIdsAsync(clientId);
            if (orgClientIds.Count == 0)
                throw new AppException("Resource not found.", 404);

            var requests = await _serviceRequestRepo
                .Query()
                .Include(r => r.Service)
                .Include(r => r.Project)
                .Where(r => orgClientIds.Contains(r.ClientId))
                .OrderByDescending(r => r.RequestedDate)
                .Take(limit)
                .ToListAsync();

            return requests.Select(MapRequest).ToList();
        }

        public async Task<ClientDto> UpdateClientProfileAsync(int userId, UpdateClientProfileDto dto)
        {
            var client = await _clientRepo
                .Query()
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (client is null)
                throw new AppException("Client profile not found for current user.", 404);

            if (!client.IsActive)
                throw new AppException("Client profile is inactive.", 400);

            // Organization members may update contact phone only — not company fields.
            if (client.AccountRole == ClientAccountRole.Member)
            {
                client.ContactPersonPhone = dto.ContactPersonPhone?.Trim() ?? string.Empty;
                client.UpdatedAt = DateTime.UtcNow;

                _clientRepo.SaveInclude(
                    client,
                    nameof(client.ContactPersonPhone),
                    nameof(client.UpdatedAt));
                await _clientRepo.SaveChangesAsync();

                return await GetClientProfileAsync(userId);
            }

            ValidateProfileInput(dto);

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

        public async Task<ClientDto> DeactivateClientAsync(int id, bool includeOrganizationMembers = false)
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

            await ApplyClientDeactivationAsync(client);

            if (includeOrganizationMembers && client.AccountRole == ClientAccountRole.Owner)
            {
                var members = await _clientRepo
                    .Query()
                    .Where(c =>
                        c.ParentClientId == client.Id
                        && c.AccountRole == ClientAccountRole.Member
                        && c.IsActive
                        && !c.IsDeleted)
                    .ToListAsync();

                foreach (var member in members)
                    await ApplyClientDeactivationAsync(member);
            }

            await _clientRepo.SaveChangesAsync();

            return await GetClientByIdAsync(id);
        }

        private async Task ApplyClientDeactivationAsync(Client client)
        {
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
        }

        public async Task<ClientDto> ActivateClientAsync(int id)
        {
            var client = await _clientRepo
                .Query()
                .Include(c => c.ServiceRequests)
                    .ThenInclude(r => r.Project)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (client is null)
                throw new AppException("Resource not found.", 404);

            if (client.IsActive)
                throw new AppException("Client is already active.", 400);

            client.IsActive = true;
            client.UpdatedAt = DateTime.UtcNow;

            _clientRepo.SaveInclude(
                client,
                nameof(client.IsActive),
                nameof(client.UpdatedAt));

            var user = await _userRepo.GetByIDAsync(client.UserId);
            if (user is not null)
            {
                user.IsActive = true;
                user.UpdatedAt = DateTime.UtcNow;

                _userRepo.SaveInclude(
                    user,
                    nameof(user.IsActive),
                    nameof(user.UpdatedAt));
            }

            await _clientRepo.SaveChangesAsync();

            return await GetClientByIdAsync(id);
        }

        private IQueryable<Client> BuildClientListQuery()
        {
            return _clientRepo
                .Query()
                .Include(c => c.User);
        }

        private IQueryable<Client> BuildClientQuery()
        {
            return _clientRepo
                .Query()
                .Include(c => c.User)
                .Include(c => c.SalesUser)
                .Include(c => c.ServiceRequests)
                    .ThenInclude(r => r.Service)
                .Include(c => c.ServiceRequests)
                    .ThenInclude(r => r.Project);
        }

        private IQueryable<Client> BuildClientProfileQuery()
        {
            return _clientRepo
                .Query()
                .Include(c => c.User)
                .Include(c => c.SalesUser);
        }

        private static IQueryable<Client> ApplyFilters(
            IQueryable<Client> query,
            ClientFilterRequest request)
        {
            if (request.Id.HasValue)
                query = query.Where(c => c.Id == request.Id.Value);

            if (request.UserId.HasValue)
                query = query.Where(c => c.UserId == request.UserId.Value);

            if (request.SalesId.HasValue)
                query = query.Where(c => c.SalesId == request.SalesId.Value);

            if (request.IsActive.HasValue)
                query = query.Where(c => c.IsActive == request.IsActive.Value);

            // Admin company browse / Sales lists default to Owners only.
            if (request.OwnersOnly != false)
                query = query.Where(c => c.AccountRole == ClientAccountRole.Owner && c.ParentClientId == null);

            if (request.OrganizationClientId.HasValue)
            {
                var orgId = request.OrganizationClientId.Value;
                query = query.Where(c => c.Id == orgId || c.ParentClientId == orgId);
            }

            if (request.AccountRole.HasValue)
                query = query.Where(c => c.AccountRole == request.AccountRole.Value);

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

        private static void ValidateMemberCreateInput(CreateClientMemberDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FirstName)
                || string.IsNullOrWhiteSpace(dto.LastName)
                || string.IsNullOrWhiteSpace(dto.Email)
                || !dto.Email.Contains('@')
                || string.IsNullOrWhiteSpace(dto.Password)
                || dto.Password.Length < 8)
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

        private static ClientDto MapClientList(Client client, int requestsCount, int membersCount = 0)
        {
            return new ClientDto
            {
                Id = client.Id,
                UserId = client.UserId,
                Email = client.User?.Email ?? string.Empty,
                FirstName = client.User?.FirstName ?? string.Empty,
                LastName = client.User?.LastName ?? string.Empty,
                ContactPersonPhone = client.ContactPersonPhone ?? string.Empty,
                CompanyName = client.CompanyName ?? string.Empty,
                City = client.City ?? string.Empty,
                Country = client.Country ?? string.Empty,
                AccountRole = client.AccountRole,
                ParentClientId = client.ParentClientId,
                IsActive = client.IsActive,
                MembersCount = membersCount,
                RequestsCount = requestsCount,
            };
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
            var orgClientIds = await GetOrganizationClientIdsAsync(client.Id);
            var requestsCount = await _serviceRequestRepo
                .Query()
                .CountAsync(r => !r.IsDeleted && orgClientIds.Contains(r.ClientId));

            // Include request-linked and standalone projects for anyone in the organization.
            var projectsCount = orgClientIds.Count == 0
                ? 0
                : await _projectRepo
                    .Query()
                    .CountAsync(p =>
                        !p.IsDeleted
                        && ((p.ClientId.HasValue && orgClientIds.Contains(p.ClientId.Value))
                            || (p.ServiceRequest != null
                                && !p.ServiceRequest.IsDeleted
                                && orgClientIds.Contains(p.ServiceRequest.ClientId))));

            var membersCount = 0;
            if (client.AccountRole == ClientAccountRole.Owner)
            {
                membersCount = await _clientRepo
                    .Query()
                    .CountAsync(c =>
                        c.ParentClientId == client.Id
                        && c.AccountRole == ClientAccountRole.Member
                        && !c.IsDeleted);
            }

            var dto = MapClientCore(client, requestsCount, projectsCount, new List<ClientServiceRequestSummaryDto>());
            dto.MembersCount = membersCount;
            return dto;
        }

        /// <summary>
        /// Owner company scope = owner + members. Member scope = that member only.
        /// </summary>
        private async Task<IReadOnlyList<int>> GetOrganizationClientIdsAsync(int clientId)
        {
            var client = await _clientRepo
                .Query()
                .AsNoTracking()
                .Where(c => c.Id == clientId && !c.IsDeleted)
                .Select(c => new { c.Id, c.AccountRole })
                .FirstOrDefaultAsync();

            if (client is null)
                return Array.Empty<int>();

            if (client.AccountRole != ClientAccountRole.Owner)
                return new[] { client.Id };

            var memberIds = await _clientRepo
                .Query()
                .AsNoTracking()
                .Where(c =>
                    c.ParentClientId == client.Id
                    && c.AccountRole == ClientAccountRole.Member
                    && !c.IsDeleted)
                .Select(c => c.Id)
                .ToListAsync();

            var ids = new List<int>(memberIds.Count + 1) { client.Id };
            ids.AddRange(memberIds);
            return ids;
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
                SalesId = client.SalesId,
                SalesPersonName = client.SalesUser is not null
                    ? $"{client.SalesUser.FirstName} {client.SalesUser.LastName}".Trim()
                    : string.Empty,
                AccountRole = client.AccountRole,
                ParentClientId = client.ParentClientId,
                MembersCount = 0,
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
