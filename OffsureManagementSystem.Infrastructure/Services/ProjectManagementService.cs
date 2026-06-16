using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.ProjectManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities.Enum;
using TaskMangment.Application.Common.Responses;
using Client = OffshoreManagementSystem.Domain.Entities.Client;
using Project = OffshoreManagementSystem.Domain.Entities.Project;
using ProjectAssignment = OffshoreManagementSystem.Domain.Entities.ProjectAssignment;
using ProjectSkill = OffshoreManagementSystem.Domain.Entities.ProjectSkill;
using Skill = OffshoreManagementSystem.Domain.Entities.Skill;
using DomainService = OffshoreManagementSystem.Domain.Entities.Service;
using ServiceRequest = OffshoreManagementSystem.Domain.Entities.ServiceRequest;
using TeamMember = OffshoreManagementSystem.Domain.Entities.TeamMember;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ProjectManagementService : IProjectManagementService
    {
        private readonly IRepository<Project> _projectRepo;
        private readonly IRepository<ProjectAssignment> _projectAssignmentRepo;
        private readonly IRepository<ProjectSkill> _projectSkillRepo;
        private readonly IRepository<Skill> _skillRepo;
        private readonly IRepository<ServiceRequest> _serviceRequestRepo;
        private readonly IRepository<Client> _clientRepo;
        private readonly IRepository<DomainService> _serviceRepo;
        private readonly IRepository<TeamMember> _teamMemberRepo;
        private readonly IEmailNotificationService _emailNotificationService;

        public ProjectManagementService(
            IRepository<Project> projectRepo,
            IRepository<ProjectAssignment> projectAssignmentRepo,
            IRepository<ProjectSkill> projectSkillRepo,
            IRepository<Skill> skillRepo,
            IRepository<ServiceRequest> serviceRequestRepo,
            IRepository<Client> clientRepo,
            IRepository<DomainService> serviceRepo,
            IRepository<TeamMember> teamMemberRepo,
            IEmailNotificationService emailNotificationService)
        {
            _projectRepo = projectRepo;
            _projectAssignmentRepo = projectAssignmentRepo;
            _projectSkillRepo = projectSkillRepo;
            _skillRepo = skillRepo;
            _serviceRequestRepo = serviceRequestRepo;
            _clientRepo = clientRepo;
            _serviceRepo = serviceRepo;
            _teamMemberRepo = teamMemberRepo;
            _emailNotificationService = emailNotificationService;
        }

        public async Task<PagedResponse<ProjectDto>> GetAllProjectsAsync(ProjectFilterRequest request)
        {
            var query = BuildProjectQuery().AsNoTracking();
            query = await ApplyFiltersAsync(query, request);

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
            var project = await _projectRepo
                .Query()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project is null)
                throw new AppException("Resource not found.", 404);

            await EnsureLegacySkillsMigratedAsync(project);

            return await GetProjectDtoByIdAsync(id);
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
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project is null)
                throw new AppException("Resource not found.", 404);

            if (project.ServiceRequest?.ClientId != clientId)
                throw new AppException("You do not have access to this project.", 403);

            return await GetProjectDtoByIdAsync(projectId);
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

            if (!await HasActiveAssignmentAsync(projectId, teamMemberId))
                throw new AppException("You do not have access to this project.", 403);

            return await GetProjectDtoByIdAsync(projectId);
        }

        public async Task<ProjectDto> CreateProjectAsync(CreateProjectDto dto)
        {
            ValidateCreateProjectInput(dto);

            ServiceRequest request;
            if (dto.ServiceRequestId > 0)
            {
                request = await LoadRequestForProjectConversionAsync(dto.ServiceRequestId);
            }
            else
            {
                request = await CreateStandaloneServiceRequestAsync(dto);
            }

            var startDate = dto.StartDate.HasValue
                ? DateTime.SpecifyKind(dto.StartDate.Value.Date, DateTimeKind.Utc)
                : DateTime.UtcNow;

            var project = new Project
            {
                ServiceRequestId = request.Id,
                Name = string.IsNullOrWhiteSpace(dto.Name) ? request.Title.Trim() : dto.Name.Trim(),
                Description = dto.Description?.Trim() ?? request.Description ?? string.Empty,
                Status = ProjectStatus.InProgress,
                StartDate = startDate,
                TargetEndDate = dto.TargetEndDate,
                Budget = dto.Budget ?? request.Budget,
                BudgetType = dto.BudgetType,
                HourlyRate = dto.BudgetType == ProjectBudgetType.Hourly ? dto.HourlyRate : null,
                ExpectedHours = dto.BudgetType == ProjectBudgetType.Hourly ? dto.ExpectedHours : null,
                Progress = 0,
                CreatedAt = DateTime.UtcNow
            };

            await _projectRepo.AddAsync(project);
            await _projectRepo.SaveChangesAsync();

            if (dto.ServiceRequestId > 0)
            {
                await LinkRequestToProjectAsync(request);
            }

            if (dto.RequiredSkillIds is { Count: > 0 })
            {
                await SyncProjectSkillsAsync(project.Id, dto.RequiredSkillIds);
            }

            return await GetProjectByIdAsync(project.Id);
        }

        private async Task<ServiceRequest> LoadRequestForProjectConversionAsync(int serviceRequestId)
        {
            var request = await _serviceRequestRepo
                .Query()
                .Include(r => r.Project)
                .FirstOrDefaultAsync(r => r.Id == serviceRequestId);

            if (request is null)
                throw new AppException("Resource not found.", 404);

            if (request.Status != ServiceRequestStatus.PrimaryAccepted)
                throw new AppException("Only accepted requests can be converted to projects.", 400);

            if (request.Project is not null)
                throw new AppException("A project already exists for this request.", 400);

            return request;
        }

        private async Task<ServiceRequest> CreateStandaloneServiceRequestAsync(CreateProjectDto dto)
        {
            if (!dto.ClientId.HasValue || dto.ClientId.Value <= 0)
                throw new AppException("Client is required.", 400);

            if (!dto.ServiceId.HasValue || dto.ServiceId.Value <= 0)
                throw new AppException("Service is required.", 400);

            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new AppException("Project name is required.", 400);

            if (!await _clientRepo.IsExistAsync(dto.ClientId.Value))
                throw new AppException("Client not found.", 404);

            if (!await _serviceRepo.IsExistAsync(dto.ServiceId.Value))
                throw new AppException("Service not found.", 404);

            var request = new ServiceRequest
            {
                ClientId = dto.ClientId.Value,
                ServiceId = dto.ServiceId.Value,
                Title = dto.Name.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                Status = ServiceRequestStatus.AcceptedWithProject,
                RequestedDate = DateTime.UtcNow,
                DueDate = dto.TargetEndDate,
                Budget = dto.Budget,
                Priority = 3,
                CreatedAt = DateTime.UtcNow
            };

            await _serviceRequestRepo.AddAsync(request);
            await _serviceRequestRepo.SaveChangesAsync();

            return request;
        }

        private async Task LinkRequestToProjectAsync(ServiceRequest request)
        {
            request.Status = ServiceRequestStatus.AcceptedWithProject;
            request.UpdatedAt = DateTime.UtcNow;

            _serviceRequestRepo.SaveInclude(
                request,
                nameof(request.Status),
                nameof(request.UpdatedAt));
            await _serviceRequestRepo.SaveChangesAsync();
        }

        public async Task<ProjectDto> UpdateProjectAsync(int id, UpdateProjectDto dto)
        {
            ValidateUpdateProjectInput(dto);

            var project = await _projectRepo.GetByIDAsync(id);
            if (project is null)
                throw new AppException("Resource not found.", 404);

            project.Name = dto.Name.Trim();
            if (dto.RequiredSkillIds is not null)
            {
                await SyncProjectSkillsAsync(id, dto.RequiredSkillIds);
                project.Description = ProjectDescriptionSkills.StripSkillsMarker(project.Description);
            }
            else if (dto.Description is not null)
            {
                project.Description = ProjectDescriptionSkills.StripSkillsMarker(dto.Description);
            }

            project.TargetEndDate = dto.TargetEndDate;
            project.Budget = dto.Budget;
            if (dto.BudgetType.HasValue)
            {
                project.BudgetType = dto.BudgetType.Value;
                project.HourlyRate = dto.BudgetType == ProjectBudgetType.Hourly ? dto.HourlyRate : null;
                project.ExpectedHours = dto.BudgetType == ProjectBudgetType.Hourly ? dto.ExpectedHours : null;
            }

            project.Progress = dto.Progress;
            project.UpdatedAt = DateTime.UtcNow;

            _projectRepo.SaveInclude(
                project,
                nameof(project.Name),
                nameof(project.Description),
                nameof(project.TargetEndDate),
                nameof(project.Budget),
                nameof(project.BudgetType),
                nameof(project.HourlyRate),
                nameof(project.ExpectedHours),
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

            var role = dto.Role.Trim();
            int? skillId = dto.SkillId is > 0 ? dto.SkillId : null;
            if (skillId.HasValue)
                await EnsureProjectSkillIsSelectedAsync(projectId, skillId.Value);

            var existing = await FindAssignmentAsync(projectId, dto.TeamMemberId, skillId);
            if (existing is not null)
            {
                if (existing.IsActive)
                {
                    var message = skillId.HasValue
                        ? "This team member is already assigned for this skill."
                        : "Team member is already assigned to this project.";
                    throw new AppException(message, 400);
                }

                ReactivateAssignment(existing, role, skillId, dto.HourlyRate, dto.AllocatedHours);
                await _projectAssignmentRepo.SaveChangesAsync();
                return await GetProjectDtoByIdAsync(projectId);
            }

            var assignment = new ProjectAssignment
            {
                ProjectId = projectId,
                TeamMemberId = dto.TeamMemberId,
                SkillId = skillId,
                Role = role,
                AssignedDate = DateTime.UtcNow,
                IsActive = true,
                HourlyRate = dto.HourlyRate,
                AllocatedHours = dto.AllocatedHours,
                CreatedAt = DateTime.UtcNow
            };

            await _projectAssignmentRepo.AddAsync(assignment);
            await _projectAssignmentRepo.SaveChangesAsync();

            return await GetProjectDtoByIdAsync(projectId);
        }

        public async Task<ProjectDto> RemoveTeamMemberAsync(int projectId, int teamMemberId)
        {
            await EnsureProjectExistsAsync(projectId);

            var assignments = await _projectAssignmentRepo
                .GetAll(a => a.ProjectId == projectId && a.TeamMemberId == teamMemberId)
                .ToListAsync();

            if (assignments.Count == 0)
                throw new AppException("Resource not found.", 404);

            foreach (var assignment in assignments)
                DeactivateAssignment(assignment);

            await _projectAssignmentRepo.SaveChangesAsync();

            return await GetProjectDtoByIdAsync(projectId);
        }

        public async Task<ProjectDto> RemoveAssignmentAsync(int projectId, int assignmentId)
        {
            await EnsureProjectExistsAsync(projectId);

            var assignment = await _projectAssignmentRepo
                .GetAll(a => a.ProjectId == projectId && a.Id == assignmentId)
                .FirstOrDefaultAsync();

            if (assignment is null)
                throw new AppException("Resource not found.", 404);

            DeactivateAssignment(assignment);
            await _projectAssignmentRepo.SaveChangesAsync();

            return await GetProjectDtoByIdAsync(projectId);
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
                .Include(p => p.ProjectSkills)
                .Include(p => p.ProjectAssignments.Where(a => a.IsActive))
                    .ThenInclude(a => a.TeamMember)
                        .ThenInclude(t => t.User);
        }

        private async Task<IQueryable<Project>> ApplyFiltersAsync(
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
            {
                var assignedProjectIds = await GetActiveAssignedProjectIdsAsync(request.TeamMemberId.Value);
                query = query.Where(p => assignedProjectIds.Contains(p.Id));
            }

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(p =>
                    p.Name.ToLower().Contains(searchKey)
                    || p.Description.ToLower().Contains(searchKey)
                    || (p.ServiceRequest != null && p.ServiceRequest.Title.ToLower().Contains(searchKey))
                    || (p.ServiceRequest != null && p.ServiceRequest.Client.CompanyName.ToLower().Contains(searchKey))
                    || (p.ServiceRequest != null && p.ServiceRequest.Service.Name.ToLower().Contains(searchKey))
                    || p.ProjectAssignments.Any(a =>
                        a.IsActive
                        && (a.TeamMember.User.FirstName.ToLower().Contains(searchKey)
                            || a.TeamMember.User.LastName.ToLower().Contains(searchKey))));
            }

            return query;
        }

        private async Task<List<int>> GetActiveAssignedProjectIdsAsync(int teamMemberId)
        {
            return await _projectAssignmentRepo
                .GetAll(a => a.TeamMemberId == teamMemberId && a.IsActive)
                .Select(a => a.ProjectId)
                .Distinct()
                .ToListAsync();
        }

        private async Task<bool> HasActiveAssignmentAsync(int projectId, int teamMemberId)
        {
            return await _projectAssignmentRepo
                .GetAll(a => a.ProjectId == projectId && a.TeamMemberId == teamMemberId && a.IsActive)
                .AnyAsync();
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
            if (teamMemberId <= 0)
                throw new AppException("Resource not found.", 404);

            var isAssignable = await _teamMemberRepo
                .Query()
                .AnyAsync(t =>
                    t.Id == teamMemberId
                    && !t.IsDeleted
                    && t.User.IsActive
                    && !t.User.IsDeleted);

            if (!isAssignable)
                throw new AppException("Resource not found.", 404);
        }

        private static void ValidateCreateProjectInput(CreateProjectDto dto)
        {
            if (dto.ServiceRequestId > 0)
                return;

            if (!dto.ClientId.HasValue || dto.ClientId.Value <= 0)
                throw new AppException("Client is required.", 400);

            if (!dto.ServiceId.HasValue || dto.ServiceId.Value <= 0)
                throw new AppException("Service is required.", 400);

            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new AppException("Project name is required.", 400);
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

            if (currentStatus is ProjectStatus.Completed or ProjectStatus.Cancelled)
                throw new AppException("Cannot change status of a completed or cancelled project.", 400);

            // Active projects may move to any non-terminal workflow state.
            var isValid = newStatus is ProjectStatus.Pending
                or ProjectStatus.InProgress
                or ProjectStatus.OnHold
                or ProjectStatus.Completed
                or ProjectStatus.Cancelled;

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
                .FirstOrDefaultAsync(c => c.UserId == userId && c.IsActive && !c.IsDeleted);

            if (client is null)
                throw new AppException("Client profile not found for current user.", 404);

            return client.Id;
        }

        private async Task<int> GetTeamMemberIdForUserAsync(int userId)
        {
            var member = await _teamMemberRepo
                .Query()
                .AsNoTracking()
                .FirstOrDefaultAsync(t =>
                    t.UserId == userId
                    && !t.IsDeleted
                    && t.User.IsActive
                    && !t.User.IsDeleted);

            if (member is null)
                throw new AppException("Team member profile not found for current user.", 404);

            return member.Id;
        }

        private static ProjectDto MapProject(Project project)
        {
            var requiredFromTable = project.ProjectSkills?
                .Where(ps => ps.IsSelected)
                .Select(ps => ps.SkillId)
                .Distinct()
                .OrderBy(skillId => skillId)
                .ToList() ?? new List<int>();

            var legacyIds = ProjectDescriptionSkills.ParseRequiredSkillIds(project.Description);
            var requiredSkillIds = requiredFromTable.Count > 0
                ? requiredFromTable
                : legacyIds;

            return new ProjectDto
            {
                Id = project.Id,
                Name = project.Name,
                Description = ProjectDescriptionSkills.StripSkillsMarker(project.Description),
                RequiredSkillIds = requiredSkillIds,
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
                BudgetType = project.BudgetType,
                HourlyRate = project.HourlyRate,
                ExpectedHours = project.ExpectedHours,
                Progress = project.Progress,
                TeamMembers = project.ProjectAssignments
                    .Where(a => a.IsActive)
                    .OrderBy(a => a.TeamMember.User.FirstName)
                    .ThenBy(a => a.TeamMember.User.LastName)
                    .Select(MapAssignment)
                    .ToList()
            };
        }

        private async Task<ProjectDto> GetProjectDtoByIdAsync(int id)
        {
            var project = await BuildProjectQuery()
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project is null)
                throw new AppException("Resource not found.", 404);

            return MapProject(project);
        }

        private async Task EnsureLegacySkillsMigratedAsync(Project project)
        {
            var hasRows = await _projectSkillRepo
                .GetAll(ps => ps.ProjectId == project.Id)
                .AnyAsync();

            if (hasRows)
                return;

            var legacyIds = ProjectDescriptionSkills.ParseRequiredSkillIds(project.Description);
            if (legacyIds.Count == 0)
                return;

            await SyncProjectSkillsAsync(project.Id, legacyIds);

            var clean = ProjectDescriptionSkills.StripSkillsMarker(project.Description);
            if (!string.Equals(project.Description, clean, StringComparison.Ordinal))
            {
                project.Description = clean;
                project.UpdatedAt = DateTime.UtcNow;
                _projectRepo.SaveInclude(
                    project,
                    nameof(project.Description),
                    nameof(project.UpdatedAt));
                await _projectRepo.SaveChangesAsync();
            }
        }

        private async Task SyncProjectSkillsAsync(int projectId, IEnumerable<int> requiredSkillIds)
        {
            var selectedIds = requiredSkillIds?
                .Where(id => id > 0)
                .Distinct()
                .ToList() ?? new List<int>();

            var existing = await _projectSkillRepo
                .GetAll(ps => ps.ProjectId == projectId)
                .ToListAsync();

            foreach (var row in existing)
            {
                var shouldSelect = selectedIds.Contains(row.SkillId);
                if (row.IsSelected == shouldSelect)
                    continue;

                row.IsSelected = shouldSelect;
                row.UpdatedAt = DateTime.UtcNow;
                _projectSkillRepo.SaveInclude(
                    row,
                    nameof(row.IsSelected),
                    nameof(row.UpdatedAt));
            }

            foreach (var skillId in selectedIds)
            {
                await EnsureSkillActiveAsync(skillId);

                var row = existing.FirstOrDefault(ps => ps.SkillId == skillId);
                if (row is null)
                {
                    await _projectSkillRepo.AddAsync(new ProjectSkill
                    {
                        ProjectId = projectId,
                        SkillId = skillId,
                        IsSelected = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _projectSkillRepo.SaveChangesAsync();
        }

        private async Task EnsureSkillActiveAsync(int skillId)
        {
            var skill = await _skillRepo.GetByIDAsync(skillId);
            if (skill is null)
                throw new AppException("Skill not found.", 404);

            if (skill.IsActive)
                return;

            skill.IsActive = true;
            skill.UpdatedAt = DateTime.UtcNow;
            _skillRepo.SaveInclude(
                skill,
                nameof(skill.IsActive),
                nameof(skill.UpdatedAt));
            await _skillRepo.SaveChangesAsync();
        }

        private async Task EnsureProjectSkillIsSelectedAsync(int projectId, int skillId)
        {
            var row = await _projectSkillRepo
                .GetAll(ps => ps.ProjectId == projectId && ps.SkillId == skillId)
                .FirstOrDefaultAsync();

            if (row is null || !row.IsSelected)
                throw new AppException("Assign team members only to skills selected for this project.", 400);
        }

        private static ProjectAssignmentDto MapAssignment(ProjectAssignment assignment)
        {
            var skillId = assignment.SkillId ?? ProjectDescriptionSkills.SkillIdFromRole(assignment.Role);
            return new ProjectAssignmentDto
            {
                Id = assignment.Id,
                TeamMemberId = assignment.TeamMemberId,
                TeamMemberName = UserDisplayName.FromTeamMember(assignment.TeamMember),
                TeamMemberTitle = assignment.TeamMember?.Title ?? string.Empty,
                Role = ProjectDescriptionSkills.StripSkillPrefixFromRole(assignment.Role),
                SkillId = skillId,
                AssignedDate = assignment.AssignedDate,
                HourlyRate = assignment.HourlyRate,
                AllocatedHours = assignment.AllocatedHours
            };
        }

        private async Task<ProjectAssignment?> FindAssignmentAsync(
            int projectId,
            int teamMemberId,
            int? skillId)
        {
            var assignments = await _projectAssignmentRepo
                .GetAll(a => a.ProjectId == projectId && a.TeamMemberId == teamMemberId)
                .IgnoreQueryFilters()
                .Where(a => !a.IsDeleted)
                .ToListAsync();

            if (skillId is > 0)
            {
                return assignments.FirstOrDefault(a =>
                    a.SkillId == skillId
                    || (a.SkillId == null && ProjectDescriptionSkills.SkillIdFromRole(a.Role) == skillId));
            }

            return assignments.FirstOrDefault(a =>
                       a.SkillId == null && ProjectDescriptionSkills.SkillIdFromRole(a.Role) is null)
                   ?? assignments.FirstOrDefault(a => a.SkillId == null);
        }

        private static void ReactivateAssignment(
            ProjectAssignment assignment,
            string role,
            int? skillId,
            decimal? hourlyRate,
            int? allocatedHours)
        {
            assignment.IsActive = true;
            assignment.UnassignedDate = null;
            assignment.AssignedDate = DateTime.UtcNow;
            assignment.SkillId = skillId;
            assignment.Role = role;
            assignment.HourlyRate = hourlyRate;
            assignment.AllocatedHours = allocatedHours;
            assignment.UpdatedAt = DateTime.UtcNow;
        }

        private void DeactivateAssignment(ProjectAssignment assignment)
        {
            assignment.IsActive = false;
            assignment.UnassignedDate = DateTime.UtcNow;
            assignment.UpdatedAt = DateTime.UtcNow;
            _projectAssignmentRepo.SaveInclude(
                assignment,
                nameof(assignment.IsActive),
                nameof(assignment.UnassignedDate),
                nameof(assignment.UpdatedAt));
        }
    }
}
