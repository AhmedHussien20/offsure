using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.ServiceManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities.Enum;
using TaskMangment.Application.Common.Responses;
using DomainService = OffshoreManagementSystem.Domain.Entities.Service;
using ServiceRequest = OffshoreManagementSystem.Domain.Entities.ServiceRequest;
using Client = OffshoreManagementSystem.Domain.Entities.Client;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ServiceRequestManagementService : IServiceRequestManagementService
    {
        private readonly IRepository<ServiceRequest> _serviceRequestRepo;
        private readonly IRepository<Client> _clientRepo;
        private readonly IRepository<DomainService> _serviceRepo;
        private readonly IEmailNotificationService _emailNotificationService;
        private readonly IClientAccessService _clientAccess;

        public ServiceRequestManagementService(
            IRepository<ServiceRequest> serviceRequestRepo,
            IRepository<Client> clientRepo,
            IRepository<DomainService> serviceRepo,
            IEmailNotificationService emailNotificationService,
            IClientAccessService clientAccess)
        {
            _serviceRequestRepo = serviceRequestRepo;
            _clientRepo = clientRepo;
            _serviceRepo = serviceRepo;
            _emailNotificationService = emailNotificationService;
            _clientAccess = clientAccess;
        }

        public async Task<PagedResponse<ServiceRequestDto>> GetAllRequestsAsync(ServiceRequestFilterRequest request)
        {
            var query = BuildRequestListQuery();
            query = ApplyFilters(query, request);

            var totalCount = await query.CountAsync();
            var requests = await ApplySorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<ServiceRequestDto>(
                requests.Select(MapRequestList).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<PagedResponse<ServiceRequestDto>> GetClientRequestsAsync(
            int clientId,
            ServiceRequestFilterRequest request)
        {
            await EnsureClientExistsAsync(clientId);

            request.ClientId = clientId;
            return await GetAllRequestsAsync(request);
        }

        public async Task<PagedResponse<ServiceRequestDto>> GetClientRequestsForUserAsync(
            int userId,
            ServiceRequestFilterRequest request)
        {
            var accessibleClientIds = await _clientAccess.GetAccessibleClientIdsForUserAsync(userId);
            request.ClientIds = accessibleClientIds.ToList();
            request.ClientId = null;
            return await GetAllRequestsAsync(request);
        }

        public async Task<ServiceRequestDto> GetRequestByIdAsync(int id)
        {
            var request = await BuildRequestQuery()
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request is null)
                throw new AppException("Resource not found.", 404);

            return MapRequest(request);
        }

        public async Task<ServiceRequestDto> GetRequestByIdForCallerAsync(int userId, string role, int id)
        {
            var request = await GetRequestByIdAsync(id);
            await EnsureCallerCanAccessRequestAsync(userId, role, request.ClientId);
            return request;
        }

        public async Task<ServiceRequestDto> CreateRequestAsync(CreateServiceRequestDto dto, int userId)
        {
            ValidateRequestInput(dto);
            var client = await GetClientByUserIdAsync(userId);

            if(client is null)
                throw new AppException("Client profile not found for current user.", 404);

            int? serviceId = null;
            if (dto.ServiceId.HasValue && dto.ServiceId.Value > 0)
            {
                await EnsurePublicServiceExistsAsync(dto.ServiceId.Value);
                serviceId = dto.ServiceId.Value;
            }

            var request = new ServiceRequest
            {
                ClientId = client.Id,
                ServiceId = serviceId,
                Title = dto.Title.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                Status = ServiceRequestStatus.Pending,
                RequestedDate = DateTime.UtcNow,
                DueDate = dto.DueDate,
                Budget = dto.Budget,
                Priority = dto.Priority ?? 3,
                SalesId = client.SalesId,
                CreatedAt = DateTime.UtcNow
            };

            await _serviceRequestRepo.AddAsync(request);
            await _serviceRequestRepo.SaveChangesAsync();

            var createdRequest = await GetRequestByIdAsync(request.Id);
            await _emailNotificationService.NotifyAdminNewRequestAsync(createdRequest);

            return createdRequest;
        }

        public async Task<ServiceRequestDto> UpdateRequestStatusAsync(int id, ServiceRequestStatus status)
        {
            var request = await _serviceRequestRepo
                .Query()
                .Include(r => r.Project)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request is null)
                throw new AppException("Resource not found.", 404);

            EnsureValidStatusTransition(request.Status, status);

            if (status == ServiceRequestStatus.Completed)
                EnsureRequestProjectIsCompleted(request);

            request.Status = status;
            request.UpdatedAt = DateTime.UtcNow;

            _serviceRequestRepo.SaveInclude(
                request,
                nameof(request.Status),
                nameof(request.UpdatedAt));
            await _serviceRequestRepo.SaveChangesAsync();

            var updatedRequest = await GetRequestByIdAsync(id);
            if (status == ServiceRequestStatus.PrimaryAccepted)
                await _emailNotificationService.SendRequestConfirmationAsync(updatedRequest);
            else
                await _emailNotificationService.SendStatusUpdateAsync(updatedRequest);

            return updatedRequest;
        }

        public async Task<ServiceRequestDto> CancelRequestAsync(int id)
        {
            var request = await _serviceRequestRepo.GetByIDAsync(id);
            if (request is null)
                throw new AppException("Resource not found.", 404);

            if (request.Status == ServiceRequestStatus.Completed)
                throw new AppException("Completed requests cannot be cancelled.", 400);

            if (request.Status != ServiceRequestStatus.Cancelled)
            {
                request.Status = ServiceRequestStatus.Cancelled;
                request.UpdatedAt = DateTime.UtcNow;

                _serviceRequestRepo.SaveInclude(
                    request,
                    nameof(request.Status),
                    nameof(request.UpdatedAt));
                await _serviceRequestRepo.SaveChangesAsync();
            }

            var cancelledRequest = await GetRequestByIdAsync(id);
            await _emailNotificationService.SendStatusUpdateAsync(cancelledRequest);

            return cancelledRequest;
        }

        public async Task<ServiceRequestDto> CancelRequestForCallerAsync(int userId, string role, int id)
        {
            var request = await _serviceRequestRepo.GetByIDAsync(id);
            if (request is null)
                throw new AppException("Resource not found.", 404);

            await EnsureCallerCanAccessRequestAsync(userId, role, request.ClientId);
            return await CancelRequestAsync(id);
        }

        public async Task SendNotificationAsync(ServiceRequestDto request)
        {
            await _emailNotificationService.SendStatusUpdateAsync(request);
        }

        private IQueryable<ServiceRequest> BuildRequestListQuery()
        {
            return _serviceRequestRepo
                .Query()
                .Include(r => r.Client)
                    .ThenInclude(c => c.User)
                .Include(r => r.Service)
                    .ThenInclude(s => s.ServiceCategory)
                .Include(r => r.Project);
        }

        private IQueryable<ServiceRequest> BuildRequestQuery()
        {
            return _serviceRequestRepo
                .Query()
                .Include(r => r.Client)
                    .ThenInclude(c => c.User)
                .Include(r => r.Client)
                    .ThenInclude(c => c.SalesUser)
                .Include(r => r.SalesUser)
                .Include(r => r.Service)
                    .ThenInclude(s => s.ServiceCategory)
                .Include(r => r.Project);
        }

        private static IQueryable<ServiceRequest> ApplyFilters(
            IQueryable<ServiceRequest> query,
            ServiceRequestFilterRequest request)
        {
            if (request.Id.HasValue)
                query = query.Where(r => r.Id == request.Id.Value);

            if (request.Status.HasValue)
                query = query.Where(r => r.Status == request.Status.Value);

            if (request.ClientIds is { Count: > 0 })
                query = query.Where(r => request.ClientIds.Contains(r.ClientId));
            else if (request.ClientId.HasValue)
                query = query.Where(r => r.ClientId == request.ClientId.Value);

            if (request.ServiceId.HasValue)
                query = query.Where(r => r.ServiceId == request.ServiceId.Value);

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(r =>
                    r.Title.ToLower().Contains(searchKey)
                    || r.Description.ToLower().Contains(searchKey)
                    || r.Client.CompanyName.ToLower().Contains(searchKey)
                    || (r.Client.User != null && (
                        r.Client.User.FirstName.ToLower().Contains(searchKey)
                        || r.Client.User.LastName.ToLower().Contains(searchKey)))
                    || (r.Service != null && r.Service.Name.ToLower().Contains(searchKey)));
            }

            return query;
        }

        private static IQueryable<ServiceRequest> ApplySorting(
            IQueryable<ServiceRequest> query,
            ServiceRequestFilterRequest request)
        {
            var isDescending = IsDescending(request.SortDirection);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "title" => isDescending ? query.OrderByDescending(r => r.Title) : query.OrderBy(r => r.Title),
                "clientid" => isDescending ? query.OrderByDescending(r => r.ClientId) : query.OrderBy(r => r.ClientId),
                "clientname" => isDescending ? query.OrderByDescending(r => r.Client.CompanyName) : query.OrderBy(r => r.Client.CompanyName),
                "serviceid" => isDescending ? query.OrderByDescending(r => r.ServiceId) : query.OrderBy(r => r.ServiceId),
                "servicename" => isDescending ? query.OrderByDescending(r => r.Service.Name) : query.OrderBy(r => r.Service.Name),
                "status" => isDescending ? query.OrderByDescending(r => r.Status) : query.OrderBy(r => r.Status),
                "requesteddate" => isDescending ? query.OrderByDescending(r => r.RequestedDate) : query.OrderBy(r => r.RequestedDate),
                "duedate" => isDescending ? query.OrderByDescending(r => r.DueDate) : query.OrderBy(r => r.DueDate),
                "budget" => isDescending ? query.OrderByDescending(r => r.Budget) : query.OrderBy(r => r.Budget),
                "priority" => isDescending ? query.OrderByDescending(r => r.Priority) : query.OrderBy(r => r.Priority),
                _ => isDescending ? query.OrderByDescending(r => r.Id) : query.OrderBy(r => r.Id)
            };
        }

        private async Task EnsureCallerCanAccessRequestAsync(int userId, string role, int clientId)
        {
            if (!string.Equals(role, "Client", StringComparison.OrdinalIgnoreCase))
                return;

            if (!await _clientAccess.CanAccessClientIdAsync(userId, clientId))
                throw new AppException("You do not have access to this request.", 403);
        }

        private async Task EnsureClientExistsAsync(int id)
        {
            if (id <= 0 || !await _clientRepo.IsExistAsync(id))
                throw new AppException("Resource not found.", 404);
        }

        private async Task<Client> GetClientByUserIdAsync(int userId)
        {
            var client = await _clientRepo
                .Query()
                .FirstOrDefaultAsync(c => c.UserId == userId && c.IsActive);

            if (client is null)
                throw new AppException("Client profile not found for current user.", 404);

            return client;
        }

        private async Task EnsurePublicServiceExistsAsync(int id)
        {
            var exists = await _serviceRepo
                .GetAll(s => s.Id == id && s.IsVisible)
                .AnyAsync();

            if (id <= 0 || !exists)
                throw new AppException("Resource not found.", 404);
        }

        private static void ValidateRequestInput(CreateServiceRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title)
                || dto.Priority is < 1 or > 5)
            {
                throw new AppException("Invalid request.", 400);
            }

            if (dto.ServiceId.HasValue && dto.ServiceId.Value <= 0)
            {
                throw new AppException("Invalid service.", 400);
            }

            if ((!dto.ServiceId.HasValue || dto.ServiceId.Value <= 0) && string.IsNullOrWhiteSpace(dto.Description))
            {
                throw new AppException("Please provide a description of your request if no service is selected.", 400);
            }

            if (dto.DueDate.HasValue)
            {
                var dueDate = dto.DueDate.Value.Date;
                var requestedDate = DateTime.UtcNow.Date;
                if (dueDate < requestedDate)
                {
                    throw new AppException(
                        "Preferred due date cannot be before today or the request date.",
                        400);
                }
            }
        }

        private static void EnsureRequestProjectIsCompleted(ServiceRequest request)
        {
            if (request.Project is null)
                return;

            if (request.Project.Status != ProjectStatus.Completed)
            {
                throw new AppException(
                    "Complete the linked project before marking this request as Completed.",
                    400);
            }
        }

        private static void EnsureValidStatusTransition(
            ServiceRequestStatus currentStatus,
            ServiceRequestStatus newStatus)
        {
            if (currentStatus == newStatus)
                return;

            var isValid = currentStatus switch
            {
                ServiceRequestStatus.Pending => newStatus is ServiceRequestStatus.PrimaryAccepted or ServiceRequestStatus.Cancelled,
                ServiceRequestStatus.PrimaryAccepted => newStatus is ServiceRequestStatus.AcceptedWithProject or ServiceRequestStatus.Cancelled,
                ServiceRequestStatus.AcceptedWithProject => newStatus is ServiceRequestStatus.Completed or ServiceRequestStatus.Cancelled,
                _ => false
            };

            if (!isValid)
                throw new AppException("Invalid request status transition.", 400);
        }

        private static string Normalize(string value)
            => value.Trim().ToLowerInvariant();

        private static bool IsDescending(string sortDirection)
            => !string.Equals(sortDirection, "ASC", StringComparison.OrdinalIgnoreCase);

        private static int GetPageIndex(ServiceRequestFilterRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(ServiceRequestFilterRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(ServiceRequestFilterRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private static ServiceRequestDto MapRequestList(ServiceRequest request)
        {
            return new ServiceRequestDto
            {
                Id = request.Id,
                ClientId = request.ClientId,
                ClientName = request.Client?.CompanyName ?? string.Empty,
                ClientMemberName = UserDisplayName.FromUser(request.Client?.User),
                ServiceId = request.ServiceId,
                ServiceName = request.Service?.Name ?? string.Empty,
                ServiceCategoryName = request.Service?.ServiceCategory?.Name ?? string.Empty,
                Title = request.Title,
                Description = request.Description,
                Status = request.Status,
                RequestedDate = request.RequestedDate,
                DueDate = request.DueDate,
                Budget = request.Budget,
                Priority = request.Priority,
                ProjectId = request.Project?.Id,
                ProjectStatus = request.Project?.Status,
            };
        }

        private static ServiceRequestDto MapRequest(ServiceRequest request)
        {
            var salesId = request.SalesId ?? request.Client?.SalesId;
            var salesUser = request.SalesUser ?? request.Client?.SalesUser;

            return new ServiceRequestDto
            {
                Id = request.Id,
                ClientId = request.ClientId,
                ClientName = request.Client?.CompanyName ?? string.Empty,
                ClientMemberName = UserDisplayName.FromUser(request.Client?.User),
                ClientEmail = request.Client?.User?.Email ?? string.Empty,
                ServiceId = request.ServiceId,
                ServiceName = request.Service?.Name ?? string.Empty,
                ServiceCategoryName = request.Service?.ServiceCategory?.Name ?? string.Empty,
                Title = request.Title,
                Description = request.Description,
                Status = request.Status,
                RequestedDate = request.RequestedDate,
                DueDate = request.DueDate,
                Budget = request.Budget,
                Priority = request.Priority,
                ProjectId = request.Project?.Id,
                ProjectStatus = request.Project?.Status,
                SalesId = salesId,
                SalesPersonName = salesUser is not null
                    ? $"{salesUser.FirstName} {salesUser.LastName}".Trim()
                    : string.Empty
            };
        }
    }
}
