using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.ProjectManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities.Enum;
using TaskMangment.Application.Common.Responses;
using Client = OffshoreManagementSystem.Domain.Entities.Client;
using Project = OffshoreManagementSystem.Domain.Entities.Project;
using ProjectAssignment = OffshoreManagementSystem.Domain.Entities.ProjectAssignment;
using ServiceRequest = OffshoreManagementSystem.Domain.Entities.ServiceRequest;
using TeamMember = OffshoreManagementSystem.Domain.Entities.TeamMember;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ProjectManagementService : IProjectManagementService
    {
        private readonly IRepository<Project> _projectRepo;
        private readonly IRepository<ProjectAssignment> _projectAssignmentRepo;
        private readonly IRepository<ServiceRequest> _serviceRequestRepo;
        private readonly IRepository<Client> _clientRepo;
        private readonly IRepository<TeamMember> _teamMemberRepo;
        private readonly IEmailNotificationService _emailNotificationService;

        public ProjectManagementService(
            IRepository<Project> projectRepo,
            IRepository<ProjectAssignment> projectAssignmentRepo,
            IRepository<ServiceRequest> serviceRequestRepo,
            IRepository<Client> clientRepo,
            IRepository<TeamMember> teamMemberRepo,
            IEmailNotificationService emailNotificationService)
        {
            _projectRepo = projectRepo;
            _projectAssignmentRepo = projectAssignmentRepo;
            _serviceRequestRepo = serviceRequestRepo;
            _clientRepo = clientRepo;
            _teamMemberRepo = teamMemberRepo;
            _emailNotificationService = emailNotificationService;
        }

        public async Task<PagedResponse<ProjectDto>> GetAllProjectsAsync(ProjectFilterRequest request)
        {
            var query = BuildProjectQuery();
            query = ApplyFilters(query, request);

            var totalCount = await query.CountAsync();
            var projects = await ApplySorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<ProjectDto>(
                projects.Select(MapProject).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<ProjectDto> GetProjectByIdAsync(int id)
        {
            var project = await BuildProjectQuery()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project is null)
                throw new AppException("Resource not found.", 404);

            return MapProject(project);
        }

        public async Task<PagedResponse<ProjectDto>> GetClientProjectsByUserIdAsync(
            int userId,
            ProjectFilterRequest request)
        {
            var clientId = await GetClientIdForUserAsync(userId);
            request.ClientId = clientId;
            return await GetAllProjectsAsync(request);
        }

        public async Task<ProjectDto> GetClientProjectByIdAsync(int userId, int projectId)
        {
            var clientId = await GetClientIdForUserAsync(userId);
            var project = await BuildProjectQuery()
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project is null)
                throw new AppException("Resource not found.", 404);

            if (project.ServiceRequest?.ClientId != clientId)
                throw new AppException("You do not have access to this project.", 403);

            return MapProject(project);
        }

        public async Task<PagedResponse<ProjectDto>> GetTeamMemberProjectsByUserIdAsync(
            int userId,
            ProjectFilterRequest request)
        {
            var teamMemberId = await GetTeamMemberIdForUserAsync(userId);
            request.TeamMemberId = teamMemberId;
            return await GetAllProjectsAsync(request);
        }

        public async Task<ProjectDto> GetTeamMemberProjectByIdAsync(int userId, int projectId)
        {
            var teamMemberId = await GetTeamMemberIdForUserAsync(userId);
            var project = await BuildProjectQuery()
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project is null)
                throw new AppException("Resource not found.", 404);

            if (!project.ProjectAssignments.Any(a => a.TeamMemberId == teamMemberId))
                throw new AppException("You do not have access to this project.", 403);

            return MapProject(project);
        }

        public async Task<ProjectDto> CreateProjectAsync(CreateProjectDto dto)
        {
            ValidateCreateProjectInput(dto);

            var request = await _serviceRequestRepo
                .Query()
                .Include(r => r.Project)
                .FirstOrDefaultAsync(r => r.Id == dto.ServiceRequestId);

            if (request is null)
                throw new AppException("Resource not found.", 404);

            if (request.Status != ServiceRequestStatus.InProgress)
                throw new AppException("Only approved requests can be converted to projects.", 400);

            if (request.Project is not null)
                throw new AppException("A project already exists for this request.", 400);

            var project = new Project
            {
                ServiceRequestId = request.Id,
                Name = string.IsNullOrWhiteSpace(dto.Name) ? request.Title.Trim() : dto.Name.Trim(),
                Description = dto.Description?.Trim() ?? request.Description ?? string.Empty,
                Status = ProjectStatus.InProgress,
                StartDate = DateTime.UtcNow,
                TargetEndDate = dto.TargetEndDate,
                Budget = dto.Budget ?? request.Budget,
                Progress = 0,
                CreatedAt = DateTime.UtcNow
            };

            await _projectRepo.AddAsync(project);
            await _projectRepo.SaveChangesAsync();

            return await GetProjectByIdAsync(project.Id);
        }

        public async Task<ProjectDto> UpdateProjectAsync(int id, UpdateProjectDto dto)
        {
            ValidateUpdateProjectInput(dto);

            var project = await _projectRepo.GetByIDAsync(id);
            if (project is null)
                throw new AppException("Resource not found.", 404);

            project.Name = dto.Name.Trim();
            project.Description = dto.Description?.Trim() ?? string.Empty;
            project.TargetEndDate = dto.TargetEndDate;
            project.Budget = dto.Budget;
            project.Progress = dto.Progress;
            project.UpdatedAt = DateTime.UtcNow;

            _projectRepo.SaveInclude(
                project,
                nameof(project.Name),
                nameof(project.Description),
                nameof(project.TargetEndDate),
                nameof(project.Budget),
                nameof(project.Progress),
                nameof(project.UpdatedAt));
            await _projectRepo.SaveChangesAsync();

            return await GetProjectByIdAsync(id);
        }

        public async Task<ProjectDto> AssignTeamMemberAsync(int projectId, AssignProjectTeamMemberDto dto)
        {
            ValidateAssignmentInput(dto);
            await EnsureProjectExistsAsync(projectId);
            await EnsureTeamMemberExistsAsync(dto.TeamMemberId);

            var existingAssignment = await _projectAssignmentRepo
                .GetAll(a => a.ProjectId == projectId && a.TeamMemberId == dto.TeamMemberId)
                .FirstOrDefaultAsync();

            if (existingAssignment is not null)
                throw new AppException("Team member is already assigned to this project.", 400);

            var assignment = new ProjectAssignment
            {
                ProjectId = projectId,
                TeamMemberId = dto.TeamMemberId,
                Role = dto.Role.Trim(),
                AssignedDate = DateTime.UtcNow,
                HourlyRate = dto.HourlyRate,
                AllocatedHours = dto.AllocatedHours,
                CreatedAt = DateTime.UtcNow
            };

            await _projectAssignmentRepo.AddAsync(assignment);
            await _projectAssignmentRepo.SaveChangesAsync();

            return await GetProjectByIdAsync(projectId);
        }

        public async Task<ProjectDto> RemoveTeamMemberAsync(int projectId, int teamMemberId)
        {
            await EnsureProjectExistsAsync(projectId);

            var assignment = await _projectAssignmentRepo
                .GetAll(a => a.ProjectId == projectId && a.TeamMemberId == teamMemberId)
                .FirstOrDefaultAsync();

            if (assignment is null)
                throw new AppException("Resource not found.", 404);

            _projectAssignmentRepo.HardDelete(assignment);
            await _projectAssignmentRepo.SaveChangesAsync();

            return await GetProjectByIdAsync(projectId);
        }

        public async Task<ProjectDto> UpdateProjectStatusAsync(int projectId, ProjectStatus status)
        {
            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null)
                throw new AppException("Resource not found.", 404);

            EnsureValidStatusTransition(project.Status, status);

            project.Status = status;
            project.Progress = status == ProjectStatus.Completed ? 100 : project.Progress;
            project.EndDate = status == ProjectStatus.Completed ? DateTime.UtcNow : project.EndDate;
            project.UpdatedAt = DateTime.UtcNow;

            _projectRepo.SaveInclude(
                project,
                nameof(project.Status),
                nameof(project.Progress),
                nameof(project.EndDate),
                nameof(project.UpdatedAt));
            await _projectRepo.SaveChangesAsync();

            if (status == ProjectStatus.Completed)
                await SendProjectCompletionNotificationAsync(projectId);

            return await GetProjectByIdAsync(projectId);
        }

        private IQueryable<Project> BuildProjectQuery()
        {
            return _projectRepo
                .Query()
                .Include(p => p.ServiceRequest)
                    .ThenInclude(r => r.Client)
                        .ThenInclude(c => c.User)
                .Include(p => p.ServiceRequest)
                    .ThenInclude(r => r.Service)
                .Include(p => p.ProjectAssignments)
                    .ThenInclude(a => a.TeamMember);
        }

        private static IQueryable<Project> ApplyFilters(
            IQueryable<Project> query,
            ProjectFilterRequest request)
        {
            if (request.Id.HasValue)
                query = query.Where(p => p.Id == request.Id.Value);

            if (request.Status.HasValue)
                query = query.Where(p => p.Status == request.Status.Value);

            if (request.ServiceRequestId.HasValue)
                query = query.Where(p => p.ServiceRequestId == request.ServiceRequestId.Value);

            if (request.ClientId.HasValue)
                query = query.Where(p => p.ServiceRequest != null && p.ServiceRequest.ClientId == request.ClientId.Value);

            if (request.ServiceId.HasValue)
                query = query.Where(p => p.ServiceRequest != null && p.ServiceRequest.ServiceId == request.ServiceId.Value);

            if (request.TeamMemberId.HasValue)
                query = query.Where(p => p.ProjectAssignments.Any(a => a.TeamMemberId == request.TeamMemberId.Value));

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(p =>
                    p.Name.ToLower().Contains(searchKey)
                    || p.Description.ToLower().Contains(searchKey)
                    || (p.ServiceRequest != null && p.ServiceRequest.Title.ToLower().Contains(searchKey))
                    || (p.ServiceRequest != null && p.ServiceRequest.Client.CompanyName.ToLower().Contains(searchKey))
                    || (p.ServiceRequest != null && p.ServiceRequest.Service.Name.ToLower().Contains(searchKey))
                    || p.ProjectAssignments.Any(a => a.TeamMember.FullName.ToLower().Contains(searchKey)));
            }

            return query;
        }

        private static IQueryable<Project> ApplySorting(
            IQueryable<Project> query,
            ProjectFilterRequest request)
        {
            var isDescending = IsDescending(request.SortDirection);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "name" => isDescending ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name),
                "status" => isDescending ? query.OrderByDescending(p => p.Status) : query.OrderBy(p => p.Status),
                "startdate" => isDescending ? query.OrderByDescending(p => p.StartDate) : query.OrderBy(p => p.StartDate),
                "enddate" => isDescending ? query.OrderByDescending(p => p.EndDate) : query.OrderBy(p => p.EndDate),
                "targetenddate" => isDescending ? query.OrderByDescending(p => p.TargetEndDate) : query.OrderBy(p => p.TargetEndDate),
                "budget" => isDescending ? query.OrderByDescending(p => p.Budget) : query.OrderBy(p => p.Budget),
                "progress" => isDescending ? query.OrderByDescending(p => p.Progress) : query.OrderBy(p => p.Progress),
                "clientname" => isDescending ? query.OrderByDescending(p => p.ServiceRequest!.Client.CompanyName) : query.OrderBy(p => p.ServiceRequest!.Client.CompanyName),
                "servicename" => isDescending ? query.OrderByDescending(p => p.ServiceRequest!.Service.Name) : query.OrderBy(p => p.ServiceRequest!.Service.Name),
                _ => isDescending ? query.OrderByDescending(p => p.Id) : query.OrderBy(p => p.Id)
            };
        }

        private async Task EnsureProjectExistsAsync(int projectId)
        {
            if (projectId <= 0 || !await _projectRepo.IsExistAsync(projectId))
                throw new AppException("Resource not found.", 404);
        }

        private async Task SendProjectCompletionNotificationAsync(int projectId)
        {
            var project = await BuildProjectQuery()
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project?.ServiceRequest?.Client is null)
                return;

            await _emailNotificationService.SendProjectCompletionAsync(
                project.ServiceRequest.Client.User?.Email ?? string.Empty,
                project.ServiceRequest.Client.CompanyName,
                project.Name);
        }

        private async Task EnsureTeamMemberExistsAsync(int teamMemberId)
        {
            if (teamMemberId <= 0 || !await _teamMemberRepo.IsExistAsync(teamMemberId))
                throw new AppException("Resource not found.", 404);
        }

        private static void ValidateCreateProjectInput(CreateProjectDto dto)
        {
            if (dto.ServiceRequestId <= 0)
                throw new AppException("Invalid request.", 400);
        }

        private static void ValidateUpdateProjectInput(UpdateProjectDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) || dto.Progress is < 0 or > 100)
                throw new AppException("Invalid request.", 400);
        }

        private static void ValidateAssignmentInput(AssignProjectTeamMemberDto dto)
        {
            if (dto.TeamMemberId <= 0
                || string.IsNullOrWhiteSpace(dto.Role)
                || dto.HourlyRate < 0
                || dto.AllocatedHours < 0)
            {
                throw new AppException("Invalid request.", 400);
            }
        }

        private static void EnsureValidStatusTransition(ProjectStatus currentStatus, ProjectStatus newStatus)
        {
            if (currentStatus == newStatus)
                return;

            var isValid = currentStatus == ProjectStatus.InProgress
                && newStatus == ProjectStatus.Completed;

            if (!isValid)
                throw new AppException("Invalid project status transition.", 400);
        }

        private static string Normalize(string value)
            => value.Trim().ToLowerInvariant();

        private static bool IsDescending(string sortDirection)
            => !string.Equals(sortDirection, "ASC", StringComparison.OrdinalIgnoreCase);

        private static int GetPageIndex(ProjectFilterRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(ProjectFilterRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(ProjectFilterRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private async Task<int> GetClientIdForUserAsync(int userId)
        {
            var client = await _clientRepo
                .Query()
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (client is null)
                throw new AppException("Client profile not found for current user.", 404);

            return client.Id;
        }

        private async Task<int> GetTeamMemberIdForUserAsync(int userId)
        {
            var member = await _teamMemberRepo
                .Query()
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.UserId == userId);

            if (member is null)
                throw new AppException("Team member profile not found for current user.", 404);

            return member.Id;
        }

        private static ProjectDto MapProject(Project project)
        {
            return new ProjectDto
            {
                Id = project.Id,
                Name = project.Name,
                Description = project.Description,
                ServiceRequestId = project.ServiceRequestId,
                ServiceRequestTitle = project.ServiceRequest?.Title ?? string.Empty,
                ClientId = project.ServiceRequest?.ClientId,
                ClientName = project.ServiceRequest?.Client?.CompanyName ?? string.Empty,
                ServiceId = project.ServiceRequest?.ServiceId,
                ServiceName = project.ServiceRequest?.Service?.Name ?? string.Empty,
                Status = project.Status,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                TargetEndDate = project.TargetEndDate,
                Budget = project.Budget,
                Progress = project.Progress,
                TeamMembers = project.ProjectAssignments
                    .OrderBy(a => a.TeamMember.FullName)
                    .Select(MapAssignment)
                    .ToList()
            };
        }

        private static ProjectAssignmentDto MapAssignment(ProjectAssignment assignment)
        {
            return new ProjectAssignmentDto
            {
                Id = assignment.Id,
                TeamMemberId = assignment.TeamMemberId,
                TeamMemberName = assignment.TeamMember?.FullName ?? string.Empty,
                TeamMemberTitle = assignment.TeamMember?.Title ?? string.Empty,
                Role = assignment.Role,
                AssignedDate = assignment.AssignedDate,
                HourlyRate = assignment.HourlyRate,
                AllocatedHours = assignment.AllocatedHours
            };
        }
    }
}
