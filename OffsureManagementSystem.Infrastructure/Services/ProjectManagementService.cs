using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using OffsureManagementSystem.Application.DTOs.ProjectManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities.Enum;
using TaskMangment.Application.Common.Responses;
using Client = OffshoreManagementSystem.Domain.Entities.Client;
using Project = OffshoreManagementSystem.Domain.Entities.Project;
using ProjectAssignment = OffshoreManagementSystem.Domain.Entities.ProjectAssignment;
using ProjectMilestone = OffshoreManagementSystem.Domain.Entities.ProjectMilestone;
using ProjectResourceManager = OffshoreManagementSystem.Domain.Entities.ProjectResourceManager;
using ProjectSkill = OffshoreManagementSystem.Domain.Entities.ProjectSkill;
using Skill = OffshoreManagementSystem.Domain.Entities.Skill;
using DomainService = OffshoreManagementSystem.Domain.Entities.Service;
using ServiceRequest = OffshoreManagementSystem.Domain.Entities.ServiceRequest;
using TeamMember = OffshoreManagementSystem.Domain.Entities.TeamMember;
using User = OffshoreManagementSystem.Domain.Entities.User;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ProjectManagementService : IProjectManagementService
    {
        private const int MinMilestoneCount = 2;
        private const int MaxMilestoneCount = 20;
        private const decimal MilestonePercentageTolerance = 0.01m;

        private readonly IRepository<Project> _projectRepo;
        private readonly IRepository<ProjectAssignment> _projectAssignmentRepo;
        private readonly IRepository<ProjectSkill> _projectSkillRepo;
        private readonly IRepository<ProjectResourceManager> _projectResourceManagerRepo;
        private readonly IRepository<ProjectMilestone> _projectMilestoneRepo;
        private readonly IRepository<Skill> _skillRepo;
        private readonly IRepository<ServiceRequest> _serviceRequestRepo;
        private readonly IRepository<Client> _clientRepo;
        private readonly IRepository<DomainService> _serviceRepo;
        private readonly IRepository<TeamMember> _teamMemberRepo;
        private readonly IRepository<User> _userRepo;
        private readonly IEmailNotificationService _emailNotificationService;
        private readonly IClientAccessService _clientAccess;

        public ProjectManagementService(
            IRepository<Project> projectRepo,
            IRepository<ProjectAssignment> projectAssignmentRepo,
            IRepository<ProjectSkill> projectSkillRepo,
            IRepository<ProjectResourceManager> projectResourceManagerRepo,
            IRepository<ProjectMilestone> projectMilestoneRepo,
            IRepository<Skill> skillRepo,
            IRepository<ServiceRequest> serviceRequestRepo,
            IRepository<Client> clientRepo,
            IRepository<DomainService> serviceRepo,
            IRepository<TeamMember> teamMemberRepo,
            IRepository<User> userRepo,
            IEmailNotificationService emailNotificationService,
            IClientAccessService clientAccess)
        {
            _projectRepo = projectRepo;
            _projectAssignmentRepo = projectAssignmentRepo;
            _projectSkillRepo = projectSkillRepo;
            _projectResourceManagerRepo = projectResourceManagerRepo;
            _projectMilestoneRepo = projectMilestoneRepo;
            _skillRepo = skillRepo;
            _serviceRequestRepo = serviceRequestRepo;
            _clientRepo = clientRepo;
            _serviceRepo = serviceRepo;
            _teamMemberRepo = teamMemberRepo;
            _userRepo = userRepo;
            _emailNotificationService = emailNotificationService;
            _clientAccess = clientAccess;
        }

        public async Task<PagedResponse<ProjectDto>> GetAllProjectsAsync(ProjectFilterRequest request)
        {
            var query = BuildProjectListQuery().AsNoTracking();
            query = await ApplyFiltersAsync(query, request);

            var totalCount = await query.CountAsync();
            var projects = await ApplySorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<ProjectDto>(
                projects.Select(MapProjectList).ToList(),
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
            var accessibleClientIds = await _clientAccess.GetAccessibleClientIdsForUserAsync(userId);
            request.ClientIds = accessibleClientIds.ToList();
            request.ClientId = null;
            var response = await GetAllProjectsAsync(request);
            return new PagedResponse<ProjectDto>(
                response.Data.Select(StripClientPortalFinancials).ToList(),
                response.TotalCount,
                response.PageIndex,
                response.PageSize);
        }

        public async Task<ProjectDto> GetClientProjectByIdAsync(int userId, int projectId)
        {
            var accessibleClientIds = await _clientAccess.GetAccessibleClientIdsForUserAsync(userId);
            var project = await BuildProjectQuery()
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project is null)
                throw new AppException("Resource not found.", 404);

            var projectClientId = ResolveProjectClientId(project);
            if (!projectClientId.HasValue || !accessibleClientIds.Contains(projectClientId.Value))
                throw new AppException("You do not have access to this project.", 403);

            return StripClientPortalFinancials(await GetProjectDtoByIdAsync(projectId));
        }

        public async Task<PagedResponse<ProjectDto>> GetTeamMemberProjectsByUserIdAsync(
            int userId,
            ProjectFilterRequest request)
        {
            var teamMemberId = await GetTeamMemberIdForUserAsync(userId);
            request.TeamMemberId = teamMemberId;

            var query = BuildProjectListQuery()
                .Include(p => p.ProjectAssignments.Where(a => a.IsActive && a.TeamMemberId == teamMemberId))
                .AsNoTracking();

            query = await ApplyFiltersAsync(query, request);

            var totalCount = await query.CountAsync();
            var projects = await ApplySorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<ProjectDto>(
                projects.Select(p => StripTeamMemberFinancials(MapProjectListForTeamMember(p, teamMemberId))).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<ProjectDto> GetTeamMemberProjectByIdAsync(int userId, int projectId)
        {
            var teamMemberId = await GetTeamMemberIdForUserAsync(userId);

            if (!await HasActiveAssignmentAsync(projectId, teamMemberId))
                throw new AppException("You do not have access to this project.", 403);

            return StripTeamMemberFinancials(await GetProjectDtoByIdAsync(projectId));
        }

        public async Task<PagedResponse<ProjectDto>> GetResourceManagerProjectsByUserIdAsync(
            int userId,
            ProjectFilterRequest request)
        {
            var query = BuildProjectListQuery()
                .Include(p => p.ProjectResourceManagers.Where(rm =>
                    !rm.IsDeleted && rm.IsActive && rm.ResourceManagerUserId == userId))
                .AsNoTracking()
                .Where(p =>
                    p.ProjectResourceManagers.Any(rm => !rm.IsDeleted && rm.IsActive && rm.ResourceManagerUserId == userId)
                    || p.ProjectAssignments.Any(a =>
                        a.IsActive
                        && a.TeamMember.ResourceManagerId == userId
                        && !a.TeamMember.IsDeleted));

            query = await ApplyFiltersAsync(query, request);

            var totalCount = await query.CountAsync();
            var projects = await ApplySorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<ProjectDto>(
                projects.Select(p => MapProjectListForResourceManager(p, userId)).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<ProjectDto> GetResourceManagerProjectByIdAsync(int userId, int projectId)
        {
            await EnsureProjectAccessibleToResourceManagerAsync(userId, projectId);
            var project = await GetProjectDtoByIdAsync(projectId);
            return MapProjectForResourceManagerUser(project, userId);
        }

        public async Task<ProjectDto> AssignTeamMemberForResourceManagerAsync(
            int userId,
            int projectId,
            AssignProjectTeamMemberDto dto)
        {
            await EnsureProjectAccessibleToResourceManagerAsync(userId, projectId);
            await EnsureTeamMemberManagedByUserAsync(userId, dto.TeamMemberId);
            await EnsureResourceManagerCostConfiguredAsync(userId, projectId);

            await AssignTeamMemberAsync(projectId, dto);
            return await GetResourceManagerProjectByIdAsync(userId, projectId);
        }

        public async Task<ProjectDto> UpdateProjectHourlyCostRateForResourceManagerAsync(
            int userId,
            int projectId,
            UpdateProjectRmHourlyCostRateDto dto)
        {
            await EnsureProjectAccessibleToResourceManagerAsync(userId, projectId);

            var projectEntity = await _projectRepo.GetByIDAsync(projectId)
                ?? throw new AppException("Project not found.", 404);

            if (projectEntity.BudgetType != ProjectBudgetType.Hourly)
                throw new AppException("Cost rate applies only to hourly projects.", 400);

            if (dto.HourlyCostRate <= 0)
                throw new AppException("Enter a valid cost rate per hour.", 400);

            var row = await _projectResourceManagerRepo
                .Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r =>
                    r.ProjectId == projectId
                    && r.ResourceManagerUserId == userId
                    && r.IsActive
                    && !r.IsDeleted);

            if (row is null)
                throw new AppException("You are not assigned to this project.", 403);

            if (row.HourlyCostRate is > 0)
                throw new AppException("Cost rate is already set for this project and cannot be changed.", 400);

            row.HourlyCostRate = dto.HourlyCostRate;
            row.UpdatedAt = DateTime.UtcNow;
            _projectResourceManagerRepo.SaveInclude(
                row,
                nameof(row.HourlyCostRate),
                nameof(row.UpdatedAt));
            await _projectResourceManagerRepo.SaveChangesAsync();

            return await GetResourceManagerProjectByIdAsync(userId, projectId);
        }

        public async Task<ProjectDto> UpdateProjectFixedCostAmountForResourceManagerAsync(
            int userId,
            int projectId,
            UpdateProjectRmFixedCostAmountDto dto)
        {
            await EnsureProjectAccessibleToResourceManagerAsync(userId, projectId);

            var projectEntity = await _projectRepo.GetByIDAsync(projectId)
                ?? throw new AppException("Project not found.", 404);

            if (projectEntity.BudgetType != ProjectBudgetType.Total)
                throw new AppException("Fixed cost applies only to fixed budget projects.", 400);

            if (dto.FixedCostAmount <= 0)
                throw new AppException("Enter a valid fixed cost amount.", 400);

            var row = await _projectResourceManagerRepo
                .Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r =>
                    r.ProjectId == projectId
                    && r.ResourceManagerUserId == userId
                    && r.IsActive
                    && !r.IsDeleted);

            if (row is null)
                throw new AppException("You are not assigned to this project.", 403);

            if (row.FixedCostAmount is > 0)
                throw new AppException("Fixed cost is already set for this project and cannot be changed.", 400);

            row.FixedCostAmount = dto.FixedCostAmount;
            row.UpdatedAt = DateTime.UtcNow;
            _projectResourceManagerRepo.SaveInclude(
                row,
                nameof(row.FixedCostAmount),
                nameof(row.UpdatedAt));
            await _projectResourceManagerRepo.SaveChangesAsync();

            return await GetResourceManagerProjectByIdAsync(userId, projectId);
        }

        public async Task<ProjectDto> RemoveAssignmentForResourceManagerAsync(
            int userId,
            int projectId,
            int assignmentId)
        {
            await EnsureProjectAccessibleToResourceManagerAsync(userId, projectId);

            var assignment = await _projectAssignmentRepo
                .Query()
                .IgnoreQueryFilters()
                .Include(a => a.TeamMember)
                .FirstOrDefaultAsync(a =>
                    a.ProjectId == projectId
                    && a.Id == assignmentId
                    && a.IsActive
                    && !a.IsDeleted);

            if (assignment is null)
                throw new AppException("Resource not found.", 404);

            if (assignment.TeamMember?.ResourceManagerId != userId)
                throw new AppException("You can only unassign your own team members.", 403);

            DeactivateAssignment(assignment);
            await _projectAssignmentRepo.SaveChangesAsync();

            return await GetResourceManagerProjectByIdAsync(userId, projectId);
        }

        public async Task<ProjectDto> UpdateProjectDeliveryForResourceManagerAsync(
            int userId,
            int projectId,
            UpdateProjectDeliveryDto dto)
        {
            if (dto.Progress is < 0 or > 100)
                throw new AppException("Invalid request.", 400);

            await EnsureProjectAccessibleToResourceManagerAsync(userId, projectId);

            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null)
                throw new AppException("Resource not found.", 404);

            project.Status = dto.Status;
            project.Progress = dto.Progress;
            if (dto.Status == ProjectStatus.Completed)
            {
                project.Progress = 100;
                project.EndDate = DateTime.UtcNow;
            }

            project.UpdatedAt = DateTime.UtcNow;

            _projectRepo.SaveInclude(
                project,
                nameof(project.Status),
                nameof(project.Progress),
                nameof(project.EndDate),
                nameof(project.UpdatedAt));
            await _projectRepo.SaveChangesAsync();

            if (dto.Status == ProjectStatus.Completed)
            {
                await TrySyncServiceRequestCompletedFromProjectAsync(project);
                await SendProjectCompletionNotificationAsync(projectId);
            }

            return await GetResourceManagerProjectByIdAsync(userId, projectId);
        }

        public async Task<ProjectDto> UpdateProjectStaffingModeForResourceManagerAsync(
            int userId,
            int projectId,
            UpdateProjectStaffingModeDto dto)
        {
            await EnsureProjectAccessibleToResourceManagerAsync(userId, projectId);

            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null)
                throw new AppException("Resource not found.", 404);

            if (project.Status is ProjectStatus.Completed or ProjectStatus.Cancelled)
                throw new AppException("Staffing settings are locked for this project.", 400);

            var hasRequiredSkills = await _projectSkillRepo
                .GetAll(ps => ps.ProjectId == projectId && ps.IsSelected)
                .AnyAsync();

            project.AssignTeamBySkill = hasRequiredSkills && dto.AssignTeamBySkill;
            project.UpdatedAt = DateTime.UtcNow;

            _projectRepo.SaveInclude(
                project,
                nameof(project.AssignTeamBySkill),
                nameof(project.UpdatedAt));
            await _projectRepo.SaveChangesAsync();

            await ConsolidateDuplicateActiveAssignmentsForProjectAsync(projectId);

            return await GetResourceManagerProjectByIdAsync(userId, projectId);
        }

        public async Task<ProjectDto> UpdateProjectRequiredSkillsForResourceManagerAsync(
            int userId,
            int projectId,
            UpdateProjectRequiredSkillsDto dto)
        {
            await EnsureProjectAccessibleToResourceManagerAsync(userId, projectId);

            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null)
                throw new AppException("Resource not found.", 404);

            if (project.Status is ProjectStatus.Completed or ProjectStatus.Cancelled)
                throw new AppException("Staffing settings are locked for this project.", 400);

            var ids = (dto.RequiredSkillIds ?? new List<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            await SyncProjectSkillsAsync(projectId, ids);

            if (ids.Count == 0)
            {
                project.AssignTeamBySkill = false;
            }

            project.Description = ProjectDescriptionSkills.StripSkillsMarker(project.Description);
            project.UpdatedAt = DateTime.UtcNow;

            _projectRepo.SaveInclude(
                project,
                nameof(project.Description),
                nameof(project.AssignTeamBySkill),
                nameof(project.UpdatedAt));
            await _projectRepo.SaveChangesAsync();

            await ConsolidateDuplicateActiveAssignmentsForProjectAsync(projectId);

            return await GetResourceManagerProjectByIdAsync(userId, projectId);
        }

        public async Task<ProjectDto> SetProjectResourceManagersAsync(int projectId, SetProjectResourceManagersDto dto)
        {
            await EnsureProjectExistsAsync(projectId);

            var userIds = (dto.ResourceManagerUserIds ?? new List<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            await ValidateResourceManagerUsersAsync(userIds);

            if (userIds.Count > 2)
                throw new AppException("A project can have at most 2 resource managers.", 400);

            // Include inactive/soft-deleted rows. Query filters hide IsActive=false,
            // which previously caused re-adding an RM to INSERT and hit the unique index.
            var existing = await _projectResourceManagerRepo
                .Query()
                .IgnoreQueryFilters()
                .Where(r => r.ProjectId == projectId)
                .ToListAsync();

            var target = userIds.ToHashSet();

            var removedRmUserIds = existing
                .Where(r => !r.IsDeleted && r.IsActive && !target.Contains(r.ResourceManagerUserId))
                .Select(r => r.ResourceManagerUserId)
                .ToList();

            foreach (var row in existing.Where(r => !r.IsDeleted && r.IsActive && !target.Contains(r.ResourceManagerUserId)))
            {
                row.IsActive = false;
                row.UpdatedAt = DateTime.UtcNow;
                _projectResourceManagerRepo.SaveInclude(
                    row,
                    nameof(row.IsActive),
                    nameof(row.UpdatedAt));
            }

            foreach (var resourceManagerUserId in userIds)
            {
                var row = existing
                    .Where(r => r.ResourceManagerUserId == resourceManagerUserId)
                    .OrderBy(r => r.IsDeleted)
                    .ThenByDescending(r => r.IsActive)
                    .ThenByDescending(r => r.Id)
                    .FirstOrDefault();

                if (row is null)
                {
                    await _projectResourceManagerRepo.AddAsync(new ProjectResourceManager
                    {
                        ProjectId = projectId,
                        ResourceManagerUserId = resourceManagerUserId,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    row.IsActive = true;
                    row.IsDeleted = false;
                    row.DeletedAt = null;
                    row.UpdatedAt = DateTime.UtcNow;
                    _projectResourceManagerRepo.SaveInclude(
                        row,
                        nameof(row.IsActive),
                        nameof(row.IsDeleted),
                        nameof(row.DeletedAt),
                        nameof(row.UpdatedAt));
                }
            }

            await _projectResourceManagerRepo.SaveChangesAsync();

            if (removedRmUserIds.Count > 0)
                await DeactivateAssignmentsForResourceManagersAsync(projectId, removedRmUserIds);

            return await GetProjectByIdAsync(projectId);
        }

        public async Task<ProjectDto> UpsertProjectMilestonesAsync(int projectId, UpsertProjectMilestonesDto dto)
        {
            var project = await _projectRepo
                .Query()
                .Include(p => p.ProjectMilestones.Where(m => !m.IsDeleted))
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project is null)
                throw new AppException("Resource not found.", 404);

            EnsureMilestoneProject(project);

            var items = (dto.Milestones ?? new List<UpsertProjectMilestoneItemDto>())
                .OrderBy(m => m.Order)
                .ThenBy(m => m.Name)
                .ToList();

            if (items.Count == 0)
                throw new AppException("Add at least one milestone.", 400);

            if (items.Count > project.MilestoneCount)
                throw new AppException($"This project allows up to {project.MilestoneCount} milestones.", 400);

            ValidateMilestonePercentages(items);
            ValidateMilestoneDates(items, project.StartDate, project.TargetEndDate);

            var budget = project.Budget ?? 0;
            var incomingIds = items.Where(m => m.Id.HasValue && m.Id.Value > 0).Select(m => m.Id!.Value).ToHashSet();
            var existing = project.ProjectMilestones.Where(m => !m.IsDeleted).ToList();

            foreach (var row in existing.Where(m => !incomingIds.Contains(m.Id)))
            {
                if (row.Status == MilestoneStatus.Completed)
                    throw new AppException("Completed milestones cannot be removed.", 400);

                row.IsDeleted = true;
                row.UpdatedAt = DateTime.UtcNow;
                _projectMilestoneRepo.SaveInclude(row, nameof(row.IsDeleted), nameof(row.UpdatedAt));
            }

            foreach (var item in items)
            {
                if (string.IsNullOrWhiteSpace(item.Name))
                    throw new AppException("Each milestone needs a name.", 400);

                var percentage = Math.Round(item.PaymentPercentage, 2);
                var amount = CalculateMilestoneAmount(budget, percentage);

                if (item.Id is > 0)
                {
                    var row = existing.FirstOrDefault(m => m.Id == item.Id.Value);
                    if (row is null)
                        throw new AppException("Milestone not found.", 404);

                    if (row.Status == MilestoneStatus.Completed)
                        throw new AppException("Completed milestones cannot be edited.", 400);

                    row.Name = item.Name.Trim();
                    row.Description = item.Description?.Trim();
                    row.Order = item.Order > 0 ? item.Order : row.Order;
                    row.PaymentPercentage = percentage;
                    row.PaymentAmount = amount;
                    row.StartDate = item.StartDate;
                    row.EndDate = item.EndDate;
                    row.UpdatedAt = DateTime.UtcNow;
                    _projectMilestoneRepo.SaveInclude(
                        row,
                        nameof(row.Name),
                        nameof(row.Description),
                        nameof(row.Order),
                        nameof(row.PaymentPercentage),
                        nameof(row.PaymentAmount),
                        nameof(row.StartDate),
                        nameof(row.EndDate),
                        nameof(row.UpdatedAt));
                }
                else
                {
                    await _projectMilestoneRepo.AddAsync(new ProjectMilestone
                    {
                        ProjectId = projectId,
                        Name = item.Name.Trim(),
                        Description = item.Description?.Trim(),
                        Order = item.Order > 0 ? item.Order : items.IndexOf(item) + 1,
                        PaymentPercentage = percentage,
                        PaymentAmount = amount,
                        StartDate = item.StartDate,
                        EndDate = item.EndDate,
                        Status = MilestoneStatus.NotStarted,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _projectMilestoneRepo.SaveChangesAsync();
            return await GetProjectByIdAsync(projectId);
        }

        private async Task SyncProjectProgressFromMilestonesAsync(int projectId)
        {
            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null || !project.UsesMilestones)
                return;

            var milestones = await _projectMilestoneRepo
                .GetAll(m => m.ProjectId == projectId && !m.IsDeleted)
                .ToListAsync();

            if (milestones.Count == 0)
                return;

            var completedPercent = milestones
                .Where(m => m.Status == MilestoneStatus.Completed)
                .Sum(m => m.PaymentPercentage);

            var targetProgress = (int)Math.Round(completedPercent, MidpointRounding.AwayFromZero);
            targetProgress = Math.Min(100, Math.Max(0, targetProgress));

            var currentProgress = project.Progress ?? 0;
            if (targetProgress <= currentProgress)
                return;

            project.Progress = targetProgress;
            project.UpdatedAt = DateTime.UtcNow;
            _projectRepo.SaveInclude(project, nameof(project.Progress), nameof(project.UpdatedAt));
            await _projectRepo.SaveChangesAsync();
        }

        public async Task<ProjectDto> UpdateProjectMilestoneStatusAsync(
            int projectId,
            int milestoneId,
            UpdateProjectMilestoneStatusDto dto)
        {
            await UpdateProjectMilestoneStatusCoreAsync(projectId, milestoneId, dto);
            return await GetProjectByIdAsync(projectId);
        }

        public async Task<ProjectDto> UpdateProjectMilestoneStatusForResourceManagerAsync(
            int userId,
            int projectId,
            int milestoneId,
            UpdateProjectMilestoneStatusDto dto)
        {
            await EnsureProjectAccessibleToResourceManagerAsync(userId, projectId);

            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null)
                throw new AppException("Resource not found.", 404);

            if (project.Status is ProjectStatus.Completed or ProjectStatus.Cancelled)
                throw new AppException("This project is locked.", 400);

            await UpdateProjectMilestoneStatusCoreAsync(projectId, milestoneId, dto);
            return await GetResourceManagerProjectByIdAsync(userId, projectId);
        }

        private async Task UpdateProjectMilestoneStatusCoreAsync(
            int projectId,
            int milestoneId,
            UpdateProjectMilestoneStatusDto dto)
        {
            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null)
                throw new AppException("Resource not found.", 404);

            EnsureMilestoneProject(project);

            var milestone = await _projectMilestoneRepo
                .GetAll(m => m.ProjectId == projectId && m.Id == milestoneId && !m.IsDeleted)
                .FirstOrDefaultAsync();

            if (milestone is null)
                throw new AppException("Milestone not found.", 404);

            if (milestone.Status == MilestoneStatus.Completed)
                throw new AppException("Completed milestones cannot be changed.", 400);

            milestone.Status = dto.Status;
            milestone.UpdatedAt = DateTime.UtcNow;
            _projectMilestoneRepo.SaveInclude(milestone, nameof(milestone.Status), nameof(milestone.UpdatedAt));
            await _projectMilestoneRepo.SaveChangesAsync();

            await SyncProjectProgressFromMilestonesAsync(projectId);
            await TryCompleteProjectFromMilestonesAsync(projectId);
        }

        private async Task TryCompleteProjectFromMilestonesAsync(int projectId)
        {
            var milestones = await _projectMilestoneRepo
                .GetAll(m => m.ProjectId == projectId && !m.IsDeleted)
                .ToListAsync();

            if (milestones.Count == 0)
                return;

            if (milestones.Any(m => m.Status != MilestoneStatus.Completed))
                return;

            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null || project.Status == ProjectStatus.Completed)
                return;

            project.Status = ProjectStatus.Completed;
            project.Progress = 100;
            project.EndDate = DateTime.UtcNow;
            project.UpdatedAt = DateTime.UtcNow;
            _projectRepo.SaveInclude(
                project,
                nameof(project.Status),
                nameof(project.Progress),
                nameof(project.EndDate),
                nameof(project.UpdatedAt));
            await _projectRepo.SaveChangesAsync();

            await TrySyncServiceRequestCompletedFromProjectAsync(project);
            await SendProjectCompletionNotificationAsync(projectId);
        }

        private static void EnsureMilestoneProject(Project project)
        {
            if (project.BudgetType == ProjectBudgetType.Hourly)
                throw new AppException("Milestones are only available for fixed budget projects.", 400);

            if (!project.UsesMilestones || !project.MilestoneCount.HasValue)
                throw new AppException("This project does not use milestones.", 400);
        }

        private static void ValidateMilestonePercentages(IReadOnlyList<UpsertProjectMilestoneItemDto> items)
        {
            if (items.Any(m => m.PaymentPercentage <= 0))
                throw new AppException("Each milestone needs a payment percentage greater than zero.", 400);

            var total = items.Sum(m => m.PaymentPercentage);
            if (Math.Abs(total - 100m) > MilestonePercentageTolerance)
                throw new AppException("Milestone payment percentages must total 100%.", 400);
        }

        private static void ValidateMilestoneDates(
            IReadOnlyList<UpsertProjectMilestoneItemDto> items,
            DateTime? projectStartDate,
            DateTime? projectTargetEndDate)
        {
            var projectStart = projectStartDate?.Date;
            var projectEnd = projectTargetEndDate?.Date;
            var dated = new List<(int Order, string Label, DateTime Start, DateTime End)>();

            foreach (var item in items.OrderBy(m => m.Order).ThenBy(m => m.Name))
            {
                var label = string.IsNullOrWhiteSpace(item.Name)
                    ? $"Phase {item.Order}"
                    : item.Name.Trim();

                if (!item.StartDate.HasValue || !item.EndDate.HasValue)
                    throw new AppException($"{label}: enter both start and end dates.", 400);

                var start = item.StartDate.Value.Date;
                var end = item.EndDate.Value.Date;

                if (start > end)
                    throw new AppException($"{label}: start date must be on or before the end date.", 400);

                if (projectStart.HasValue && start < projectStart.Value)
                    throw new AppException(
                        $"{label}: start date cannot be before the project start ({projectStart:yyyy-MM-dd}).",
                        400);

                if (projectEnd.HasValue && end > projectEnd.Value)
                    throw new AppException(
                        $"{label}: end date cannot be after the project deadline ({projectEnd:yyyy-MM-dd}).",
                        400);

                dated.Add((item.Order, label, start, end));
            }

            for (var i = 0; i < dated.Count; i++)
            {
                for (var j = i + 1; j < dated.Count; j++)
                {
                    var first = dated[i];
                    var second = dated[j];
                    if (first.Start <= second.End && second.Start <= first.End)
                    {
                        throw new AppException(
                            $"Phases \"{first.Label}\" and \"{second.Label}\" have overlapping dates.",
                            400);
                    }
                }
            }
        }

        private static decimal CalculateMilestoneAmount(decimal budget, decimal paymentPercentage)
            => Math.Round(budget * paymentPercentage / 100m, 2, MidpointRounding.AwayFromZero);

        public async Task<ProjectDto> CreateProjectAsync(CreateProjectDto dto)
        {
            ValidateCreateProjectInput(dto);

            ServiceRequest? request = null;
            int clientId;
            int? serviceId;
            int? resolvedSalesId;
            string defaultName;
            string defaultDescription;
            decimal? defaultBudget;

            if (dto.ServiceRequestId > 0)
            {
                request = await LoadRequestForProjectConversionAsync(dto.ServiceRequestId);
                clientId = request.ClientId;
                serviceId = request.ServiceId;
                resolvedSalesId = dto.SalesId ?? request.SalesId;
                defaultName = request.Title.Trim();
                defaultDescription = request.Description ?? string.Empty;
                defaultBudget = request.Budget;
            }
            else
            {
                var client = await ValidateStandaloneProjectClientServiceAsync(dto);
                clientId = dto.ClientId!.Value;
                serviceId = dto.ServiceId;
                resolvedSalesId = dto.SalesId ?? client.SalesId;
                defaultName = dto.Name!.Trim();
                defaultDescription = dto.Description?.Trim() ?? string.Empty;
                defaultBudget = dto.Budget;
            }

            ValidateSalesAssignment(resolvedSalesId, dto.CommissionType, dto.CommissionValue);

            var startDate = dto.StartDate.HasValue
                ? DateTime.SpecifyKind(dto.StartDate.Value.Date, DateTimeKind.Utc)
                : DateTime.UtcNow;

            var project = new Project
            {
                ServiceRequestId = request?.Id,
                ClientId = clientId,
                ServiceId = serviceId,
                Name = string.IsNullOrWhiteSpace(dto.Name) ? defaultName : dto.Name.Trim(),
                Description = dto.Description?.Trim() ?? defaultDescription,
                Status = ProjectStatus.InProgress,
                StartDate = startDate,
                TargetEndDate = dto.TargetEndDate,
                Budget = dto.BudgetType == ProjectBudgetType.Hourly
                    ? null
                    : dto.Budget ?? defaultBudget,
                BudgetType = dto.BudgetType,
                HourlyRate = dto.BudgetType == ProjectBudgetType.Hourly ? dto.HourlyRate : null,
                ExpectedHours = dto.BudgetType == ProjectBudgetType.Hourly ? null : dto.ExpectedHours,
                UsesMilestones = dto.BudgetType != ProjectBudgetType.Hourly && dto.UsesMilestones,
                MilestoneCount = dto.BudgetType != ProjectBudgetType.Hourly && dto.UsesMilestones
                    ? dto.MilestoneCount
                    : null,
                AssignTeamBySkill = dto.RequiredSkillIds is { Count: > 0 },
                Progress = 0,
                SalesId = resolvedSalesId,
                CommissionType = resolvedSalesId.HasValue ? dto.CommissionType : null,
                CommissionValue = resolvedSalesId.HasValue ? dto.CommissionValue : null,
                CreatedAt = DateTime.UtcNow
            };

            await _projectRepo.AddAsync(project);
            await _projectRepo.SaveChangesAsync();

            if (request is not null)
            {
                await LinkRequestToProjectAsync(request);
            }

            if (dto.RequiredSkillIds is { Count: > 0 })
            {
                await SyncProjectSkillsAsync(project.Id, dto.RequiredSkillIds);
            }

            if (project.UsesMilestones && dto.Milestones is { Count: > 0 })
            {
                await CreateInitialMilestonesAsync(project, dto.Milestones);
            }

            return await GetProjectByIdAsync(project.Id);
        }

        private async Task CreateInitialMilestonesAsync(Project project, List<UpsertProjectMilestoneItemDto> items)
        {
            var ordered = items
                .OrderBy(m => m.Order)
                .ThenBy(m => m.Name)
                .ToList();

            if (ordered.Count != project.MilestoneCount)
                throw new AppException("Milestone entries must match the number of phases.", 400);

            ValidateMilestonePercentages(ordered);
            ValidateMilestoneDates(ordered, project.StartDate, project.TargetEndDate);

            var budget = project.Budget ?? 0;
            for (var index = 0; index < ordered.Count; index++)
            {
                var item = ordered[index];
                if (string.IsNullOrWhiteSpace(item.Name))
                    throw new AppException("Each milestone needs a name.", 400);

                var percentage = Math.Round(item.PaymentPercentage, 2);
                await _projectMilestoneRepo.AddAsync(new ProjectMilestone
                {
                    ProjectId = project.Id,
                    Name = item.Name.Trim(),
                    Description = item.Description?.Trim(),
                    Order = item.Order > 0 ? item.Order : index + 1,
                    PaymentPercentage = percentage,
                    PaymentAmount = CalculateMilestoneAmount(budget, percentage),
                    StartDate = item.StartDate,
                    EndDate = item.EndDate,
                    Status = MilestoneStatus.NotStarted,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _projectMilestoneRepo.SaveChangesAsync();
        }

        private async Task<ServiceRequest> LoadRequestForProjectConversionAsync(int serviceRequestId)
        {
            var request = await _serviceRequestRepo
                .Query()
                .Include(r => r.Project)
                .Include(r => r.Client)
                .FirstOrDefaultAsync(r => r.Id == serviceRequestId);

            if (request is null)
                throw new AppException("Resource not found.", 404);

            if (request.Status != ServiceRequestStatus.PrimaryAccepted)
                throw new AppException("Only accepted requests can be converted to projects.", 400);

            if (request.Project is not null)
                throw new AppException("A project already exists for this request.", 400);

            return request;
        }

        private async Task<Client> ValidateStandaloneProjectClientServiceAsync(CreateProjectDto dto)
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

            var client = await _clientRepo
                .Query()
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.ClientId.Value && !c.IsDeleted);

            if (client is null)
                throw new AppException("Client not found.", 404);

            if (!client.IsActive)
                throw new AppException("Inactive clients cannot be assigned to a project.", 400);

            return client;
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

        public async Task DeleteProjectAsync(int projectId, int deletedByUserId)
        {
            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null || project.IsDeleted)
                throw new AppException("Resource not found.", 404);

            ServiceRequest? linkedRequest = null;
            if (project.ServiceRequestId is int serviceRequestId && serviceRequestId > 0)
            {
                linkedRequest = await _serviceRequestRepo.GetByIDAsync(serviceRequestId);
            }

            project.IsDeleted = true;
            project.DeletedAt = DateTime.UtcNow;
            project.DeletedBy = deletedByUserId;
            project.UpdatedAt = DateTime.UtcNow;
            project.ServiceRequestId = null;

            _projectRepo.SaveInclude(
                project,
                nameof(project.IsDeleted),
                nameof(project.DeletedAt),
                nameof(project.DeletedBy),
                nameof(project.UpdatedAt),
                nameof(project.ServiceRequestId));

            if (linkedRequest is not null
                && !linkedRequest.IsDeleted
                && linkedRequest.Status == ServiceRequestStatus.AcceptedWithProject)
            {
                linkedRequest.Status = ServiceRequestStatus.PrimaryAccepted;
                linkedRequest.UpdatedAt = DateTime.UtcNow;

                _serviceRequestRepo.SaveInclude(
                    linkedRequest,
                    nameof(linkedRequest.Status),
                    nameof(linkedRequest.UpdatedAt));
            }

            await _projectRepo.SaveChangesAsync();
        }

        public async Task<IReadOnlyList<ClientDto>> GetEligibleClientsForProjectAsync(int projectId)
        {
            var project = await _projectRepo
                .Query()
                .Include(p => p.Client)
                .Include(p => p.ServiceRequest)
                    .ThenInclude(sr => sr.Client)
                .FirstOrDefaultAsync(p => p.Id == projectId && !p.IsDeleted);

            if (project is null)
                throw new AppException("Project not found.", 404);

            var currentClientId = ResolveProjectClientId(project);

            if (!currentClientId.HasValue)
            {
                var allClients = await _clientRepo
                    .Query()
                    .Include(c => c.User)
                    .Where(c => !c.IsDeleted && c.IsActive && c.User.IsActive && !c.User.IsDeleted)
                    .OrderBy(c => c.CompanyName)
                    .ThenBy(c => c.AccountRole)
                    .ToListAsync();

                return allClients.Select(c => new ClientDto
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    FirstName = c.User?.FirstName ?? string.Empty,
                    LastName = c.User?.LastName ?? string.Empty,
                    Email = c.User?.Email ?? string.Empty,
                    CompanyName = c.CompanyName ?? string.Empty,
                    AccountRole = c.AccountRole,
                    ParentClientId = c.ParentClientId,
                    IsActive = c.IsActive
                }).ToList();
            }

            var currentClient = await _clientRepo
                .Query()
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == currentClientId.Value && !c.IsDeleted);

            if (currentClient is null)
                throw new AppException("Current project client not found.", 404);

            var orgOwnerId = currentClient.AccountRole == ClientAccountRole.Owner
                ? currentClient.Id
                : (currentClient.ParentClientId ?? currentClient.Id);

            var eligibleClients = await _clientRepo
                .Query()
                .Include(c => c.User)
                .Where(c => !c.IsDeleted && c.IsActive && c.User.IsActive && !c.User.IsDeleted
                    && (c.Id == orgOwnerId || c.ParentClientId == orgOwnerId))
                .OrderBy(c => c.AccountRole)
                .ThenBy(c => c.User.FirstName)
                .ThenBy(c => c.User.LastName)
                .ToListAsync();

            return eligibleClients.Select(c => new ClientDto
            {
                Id = c.Id,
                UserId = c.UserId,
                FirstName = c.User?.FirstName ?? string.Empty,
                LastName = c.User?.LastName ?? string.Empty,
                Email = c.User?.Email ?? string.Empty,
                CompanyName = c.CompanyName ?? string.Empty,
                AccountRole = c.AccountRole,
                ParentClientId = c.ParentClientId,
                IsActive = c.IsActive
            }).ToList();
        }

        public async Task<ProjectDto> UpdateProjectAsync(int id, UpdateProjectDto dto)
        {
            ValidateUpdateProjectInput(dto);

            var project = await _projectRepo
                .Query()
                .Include(p => p.Client)
                .Include(p => p.ServiceRequest)
                    .ThenInclude(sr => sr.Client)
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

            if (project is null)
                throw new AppException("Resource not found.", 404);

            if (dto.ClientId.HasValue && dto.ClientId.Value != project.ClientId)
            {
                var newClient = await _clientRepo
                    .Query()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == dto.ClientId.Value && !c.IsDeleted);

                if (newClient is null)
                    throw new AppException("The selected client was not found.", 404);

                if (!newClient.IsActive)
                    throw new AppException("Inactive clients cannot be assigned to a project.", 400);

                var currentClientId = ResolveProjectClientId(project);
                if (currentClientId.HasValue)
                {
                    var currentClient = await _clientRepo
                        .Query()
                        .AsNoTracking()
                        .FirstOrDefaultAsync(c => c.Id == currentClientId.Value && !c.IsDeleted);

                    if (currentClient is not null)
                    {
                        var currentOrgOwnerId = currentClient.AccountRole == ClientAccountRole.Owner
                            ? currentClient.Id
                            : (currentClient.ParentClientId ?? currentClient.Id);

                        var newOrgOwnerId = newClient.AccountRole == ClientAccountRole.Owner
                            ? newClient.Id
                            : (newClient.ParentClientId ?? newClient.Id);

                        if (currentOrgOwnerId != newOrgOwnerId)
                        {
                            throw new AppException("The selected client must belong to the same organization/company.", 400);
                        }
                    }
                }

                project.ClientId = dto.ClientId.Value;
            }

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

            if (dto.StartDate.HasValue)
            {
                project.StartDate = DateTime.SpecifyKind(dto.StartDate.Value.Date, DateTimeKind.Utc);
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
            if (dto.AssignTeamBySkill.HasValue)
            {
                project.AssignTeamBySkill = dto.AssignTeamBySkill.Value;
            }

            project.UpdatedAt = DateTime.UtcNow;

            _projectRepo.SaveInclude(
                project,
                nameof(project.ClientId),
                nameof(project.Name),
                nameof(project.Description),
                nameof(project.StartDate),
                nameof(project.TargetEndDate),
                nameof(project.Budget),
                nameof(project.BudgetType),
                nameof(project.HourlyRate),
                nameof(project.ExpectedHours),
                nameof(project.Progress),
                nameof(project.AssignTeamBySkill),
                nameof(project.UpdatedAt));
            await _projectRepo.SaveChangesAsync();

            return await GetProjectByIdAsync(id);
        }

        public async Task<ProjectDto> AssignTeamMemberAsync(int projectId, AssignProjectTeamMemberDto dto)
        {
            ValidateAssignmentInput(dto);
            await EnsureProjectExistsAsync(projectId);
            await EnsureTeamMemberExistsAsync(dto.TeamMemberId);
            await EnsureTeamMemberAvailableForAssignmentAsync(dto.TeamMemberId);

            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null)
                throw new AppException("Resource not found.", 404);

            EnsureProjectAllowsTeamAssignment(project);

            await EnsureMemberResourceManagerOnProjectAsync(projectId, dto.TeamMemberId);

            var role = dto.Role.Trim();
            int? skillId = dto.SkillId is > 0 ? dto.SkillId : null;
            if (skillId.HasValue)
                await EnsureProjectSkillIsSelectedAsync(projectId, skillId.Value);

            decimal? hourlyRate = dto.HourlyRate;
            int? allocatedHours = dto.AllocatedHours;
            if (project.BudgetType == ProjectBudgetType.Hourly)
            {
                hourlyRate = await ResolveHourlyAssignmentCostRateAsync(projectId, dto.TeamMemberId, dto.HourlyRate);
                allocatedHours = null;
            }

            var all = await GetAllAssignmentsForMemberAsync(projectId, dto.TeamMemberId);
            await ConsolidateDuplicateActiveAssignmentsInMemoryAsync(all);

            all = await GetAllAssignmentsForMemberAsync(projectId, dto.TeamMemberId);

            var activeForSkill = all.FirstOrDefault(a =>
                a.IsActive && AssignmentMatchesSkill(a, skillId));
            if (activeForSkill is not null)
            {
                var message = skillId.HasValue
                    ? "This team member is already assigned for this skill."
                    : "Team member is already assigned to this project.";
                throw new AppException(message, 400);
            }

            var anyActive = all.FirstOrDefault(a => a.IsActive);
            if (anyActive is not null)
            {
                ReactivateAssignment(anyActive, role, skillId, hourlyRate, allocatedHours);
                await _projectAssignmentRepo.SaveChangesAsync();
                return await GetProjectDtoByIdAsync(projectId);
            }

            var existing = PickBestAssignment(all.Where(a => !a.IsActive), skillId);
            if (existing is not null)
            {
                ReactivateAssignment(existing, role, skillId, hourlyRate, allocatedHours);
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
                HourlyRate = hourlyRate,
                AllocatedHours = allocatedHours,
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
                .Query()
                .IgnoreQueryFilters()
                .Where(a =>
                    a.ProjectId == projectId
                    && a.TeamMemberId == teamMemberId
                    && a.IsActive
                    && !a.IsDeleted)
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
                .Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a =>
                    a.ProjectId == projectId
                    && a.Id == assignmentId
                    && a.IsActive
                    && !a.IsDeleted);

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
            {
                await TrySyncServiceRequestCompletedFromProjectAsync(project);
                await SendProjectCompletionNotificationAsync(projectId);
            }

            return await GetProjectByIdAsync(projectId);
        }

        private IQueryable<Project> BuildProjectListQuery()
        {
            return _projectRepo
                .Query()
                .Include(p => p.Client)
                    .ThenInclude(c => c.User)
                .Include(p => p.Service)
                .Include(p => p.ServiceRequest)
                    .ThenInclude(r => r.Client)
                        .ThenInclude(c => c.User)
                .Include(p => p.ServiceRequest)
                    .ThenInclude(r => r.Service);
        }

        private IQueryable<Project> BuildProjectQuery()
        {
            return _projectRepo
                .Query()
                .Include(p => p.Client)
                    .ThenInclude(c => c.User)
                .Include(p => p.Service)
                .Include(p => p.ServiceRequest)
                    .ThenInclude(r => r.Client)
                        .ThenInclude(c => c.User)
                .Include(p => p.ServiceRequest)
                    .ThenInclude(r => r.Service)
                .Include(p => p.SalesUser)
                .Include(p => p.ProjectSkills)
                .Include(p => p.ProjectResourceManagers.Where(rm => !rm.IsDeleted && rm.IsActive))
                    .ThenInclude(rm => rm.ResourceManager)
                .Include(p => p.ProjectAssignments.Where(a => a.IsActive))
                    .ThenInclude(a => a.TeamMember)
                        .ThenInclude(t => t.User)
                .Include(p => p.ProjectMilestones.Where(m => !m.IsDeleted));
        }

        private async Task<IQueryable<Project>> ApplyFiltersAsync(
            IQueryable<Project> query,
            ProjectFilterRequest request)
        {
            if (request.Id.HasValue)
                query = query.Where(p => p.Id == request.Id.Value);

            if (request.Status.HasValue)
                query = query.Where(p => p.Status == request.Status.Value);

            if (request.BudgetType.HasValue)
                query = query.Where(p => p.BudgetType == request.BudgetType.Value);

            if (request.ServiceRequestId.HasValue)
                query = query.Where(p => p.ServiceRequestId == request.ServiceRequestId.Value);

            if (request.ClientIds is { Count: > 0 })
            {
                var filterClientIds = request.ClientIds;
                query = query.Where(p =>
                    (p.ClientId.HasValue && filterClientIds.Contains(p.ClientId.Value))
                    || (p.ServiceRequest != null && filterClientIds.Contains(p.ServiceRequest.ClientId)));
            }
            else if (request.ClientId.HasValue)
            {
                var filterClientId = request.ClientId.Value;
                query = query.Where(p =>
                    p.ClientId == filterClientId
                    || (p.ServiceRequest != null && p.ServiceRequest.ClientId == filterClientId));
            }

            if (request.ServiceId.HasValue)
            {
                var filterServiceId = request.ServiceId.Value;
                query = query.Where(p =>
                    p.ServiceId == filterServiceId
                    || (p.ServiceRequest != null && p.ServiceRequest.ServiceId == filterServiceId));
            }

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
                    || (p.Client != null && p.Client.CompanyName.ToLower().Contains(searchKey))
                    || (p.Client != null && p.Client.User != null && (
                        p.Client.User.FirstName.ToLower().Contains(searchKey)
                        || p.Client.User.LastName.ToLower().Contains(searchKey)))
                    || (p.Service != null && p.Service.Name.ToLower().Contains(searchKey))
                    || (p.ServiceRequest != null && p.ServiceRequest.Title.ToLower().Contains(searchKey))
                    || (p.ServiceRequest != null && p.ServiceRequest.Client.CompanyName.ToLower().Contains(searchKey))
                    || (p.ServiceRequest != null && p.ServiceRequest.Client.User != null && (
                        p.ServiceRequest.Client.User.FirstName.ToLower().Contains(searchKey)
                        || p.ServiceRequest.Client.User.LastName.ToLower().Contains(searchKey)))
                    || (p.ServiceRequest != null && p.ServiceRequest.Service.Name.ToLower().Contains(searchKey))
                    || p.ProjectAssignments.Any(a =>
                        a.IsActive
                        && (a.TeamMember.User.FirstName.ToLower().Contains(searchKey)
                            || a.TeamMember.User.LastName.ToLower().Contains(searchKey))));
            }

            if (request.SalesId.HasValue)
                query = query.Where(p => p.SalesId == request.SalesId.Value);

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
                "clientname" => isDescending
                    ? query.OrderByDescending(p => p.Client != null ? p.Client.CompanyName : p.ServiceRequest!.Client.CompanyName)
                    : query.OrderBy(p => p.Client != null ? p.Client.CompanyName : p.ServiceRequest!.Client.CompanyName),
                "servicename" => isDescending
                    ? query.OrderByDescending(p => p.Service != null ? p.Service.Name : p.ServiceRequest!.Service.Name)
                    : query.OrderBy(p => p.Service != null ? p.Service.Name : p.ServiceRequest!.Service.Name),
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

            var client = ResolveProjectClient(project);
            if (client is null)
                return;

            await _emailNotificationService.SendProjectCompletionAsync(
                client.User?.Email ?? string.Empty,
                client.CompanyName,
                project.Name);
        }

        private async Task TrySyncServiceRequestCompletedFromProjectAsync(Project project)
        {
            if (project.Status != ProjectStatus.Completed)
                return;

            if (!project.ServiceRequestId.HasValue)
                return;

            var request = await _serviceRequestRepo.GetByIDAsync(project.ServiceRequestId.Value);
            if (request is null)
                return;

            if (request.Status is ServiceRequestStatus.Completed or ServiceRequestStatus.Cancelled)
                return;

            request.Status = ServiceRequestStatus.Completed;
            request.UpdatedAt = DateTime.UtcNow;

            _serviceRequestRepo.SaveInclude(
                request,
                nameof(request.Status),
                nameof(request.UpdatedAt));
            await _serviceRequestRepo.SaveChangesAsync();
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

        private async Task EnsureTeamMemberAvailableForAssignmentAsync(int teamMemberId)
        {
            var isAvailable = await _teamMemberRepo
                .Query()
                .AnyAsync(t => t.Id == teamMemberId && t.IsAvailable && !t.IsDeleted);

            if (!isAvailable)
                throw new AppException("This team member is marked as busy and cannot be assigned to a project.", 400);
        }

        private static void EnsureProjectAllowsTeamAssignment(Project project)
        {
            switch (project.Status)
            {
                case ProjectStatus.Cancelled:
                    throw new AppException("Cannot assign team members to a cancelled project.", 400);
                case ProjectStatus.Completed:
                    throw new AppException("Cannot assign team members to a completed project.", 400);
                case ProjectStatus.OnHold:
                    throw new AppException("Cannot assign team members while the project is on hold.", 400);
            }
        }

        private static void ValidateCreateProjectInput(CreateProjectDto dto)
        {
            if (dto.ServiceRequestId > 0)
            {
                ValidateMilestoneCreateFields(dto);
                return;
            }

            if (!dto.ClientId.HasValue || dto.ClientId.Value <= 0)
                throw new AppException("Client is required.", 400);

            if (!dto.ServiceId.HasValue || dto.ServiceId.Value <= 0)
                throw new AppException("Service is required.", 400);

            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new AppException("Project name is required.", 400);

            ValidateMilestoneCreateFields(dto);
        }

        private static void ValidateMilestoneCreateFields(CreateProjectDto dto)
        {
            if (dto.BudgetType == ProjectBudgetType.Hourly && dto.UsesMilestones)
                throw new AppException("Milestones are only available for fixed budget projects.", 400);

            if (dto.BudgetType == ProjectBudgetType.Hourly
                && (!dto.HourlyRate.HasValue || dto.HourlyRate.Value <= 0))
            {
                throw new AppException("Hourly billing rate is required for hourly projects.", 400);
            }

            if (!dto.UsesMilestones)
                return;

            if (!dto.MilestoneCount.HasValue
                || dto.MilestoneCount.Value < MinMilestoneCount
                || dto.MilestoneCount.Value > MaxMilestoneCount)
            {
                throw new AppException($"Enter between {MinMilestoneCount} and {MaxMilestoneCount} milestones.", 400);
            }

            if (dto.Milestones is { Count: > 0 })
            {
                if (dto.Milestones.Count != dto.MilestoneCount.Value)
                    throw new AppException("Milestone entries must match the number of phases.", 400);

                ValidateMilestonePercentages(dto.Milestones);

                foreach (var milestone in dto.Milestones)
                {
                    if (string.IsNullOrWhiteSpace(milestone.Name))
                        throw new AppException("Each milestone needs a name.", 400);
                }
            }
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

        private static int? ResolveProjectClientId(Project project)
            => project.ClientId ?? project.ServiceRequest?.ClientId;

        private static Client? ResolveProjectClient(Project project)
            => project.Client ?? project.ServiceRequest?.Client;

        private static int? ResolveProjectServiceId(Project project)
            => project.ServiceId ?? project.ServiceRequest?.ServiceId;

        private static string ResolveProjectClientName(Project project)
            => project.Client?.CompanyName
               ?? project.ServiceRequest?.Client?.CompanyName
               ?? string.Empty;

        private static string ResolveProjectClientMemberName(Project project)
        {
            var fromClient = UserDisplayName.FromUser(project.Client?.User);
            if (!string.IsNullOrWhiteSpace(fromClient))
                return fromClient;

            return UserDisplayName.FromUser(project.ServiceRequest?.Client?.User);
        }

        private static string ResolveProjectServiceName(Project project)
            => project.Service?.Name
               ?? project.ServiceRequest?.Service?.Name
               ?? string.Empty;

        private static ProjectDto MapProjectList(Project project)
        {
            return new ProjectDto
            {
                Id = project.Id,
                Name = project.Name,
                ClientId = ResolveProjectClientId(project),
                ClientName = ResolveProjectClientName(project),
                ClientMemberName = ResolveProjectClientMemberName(project),
                ServiceName = ResolveProjectServiceName(project),
                Status = project.Status,
                BudgetType = project.BudgetType,
                Progress = project.Progress,
                TargetEndDate = project.TargetEndDate,
            };
        }

        private static ProjectDto MapProjectListForResourceManager(Project project, int userId)
        {
            var dto = MapProjectList(project);
            var rm = project.ProjectResourceManagers?
                .FirstOrDefault(r => r.ResourceManagerUserId == userId);
            dto.MyHourlyCostRate = rm?.HourlyCostRate;
            dto.MyFixedCostAmount = rm?.FixedCostAmount;
            return dto;
        }

        private async Task EnsureResourceManagerCostConfiguredAsync(int userId, int projectId)
        {
            var project = await _projectRepo.GetByIDAsync(projectId)
                ?? throw new AppException("Project not found.", 404);

            var row = await _projectResourceManagerRepo
                .Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r =>
                    r.ProjectId == projectId
                    && r.ResourceManagerUserId == userId
                    && r.IsActive
                    && !r.IsDeleted);

            if (row is null)
                throw new AppException("You are not assigned to this project.", 403);

            if (project.BudgetType == ProjectBudgetType.Hourly && row.HourlyCostRate is not > 0)
                throw new AppException("Set your cost rate for this project before assigning team members.", 400);

            if (project.BudgetType == ProjectBudgetType.Total && row.FixedCostAmount is not > 0)
                throw new AppException("Set your fixed cost for this project before assigning team members.", 400);
        }

        private static ProjectDto MapProjectListForTeamMember(Project project, int teamMemberId)
        {
            var dto = MapProjectList(project);
            dto.MyRole = project.ProjectAssignments?
                .FirstOrDefault(a => a.IsActive && a.TeamMemberId == teamMemberId)?.Role
                ?? string.Empty;
            return dto;
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
                ClientId = ResolveProjectClientId(project),
                ClientName = ResolveProjectClientName(project),
                ClientMemberName = ResolveProjectClientMemberName(project),
                ServiceId = ResolveProjectServiceId(project),
                ServiceName = ResolveProjectServiceName(project),
                Status = project.Status,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                TargetEndDate = project.TargetEndDate,
                Budget = project.Budget,
                BudgetType = project.BudgetType,
                HourlyRate = project.HourlyRate,
                ExpectedHours = project.ExpectedHours,
                Progress = project.Progress,
                ResourceManagers = project.ProjectResourceManagers?
                    .Where(rm => !rm.IsDeleted && rm.IsActive)
                    .OrderBy(rm => rm.ResourceManager?.FirstName)
                    .ThenBy(rm => rm.ResourceManager?.LastName)
                    .Select(rm => new ProjectResourceManagerDto
                    {
                        UserId = rm.ResourceManagerUserId,
                        FullName = UserDisplayName.FromUser(rm.ResourceManager),
                        Email = rm.ResourceManager?.Email ?? string.Empty,
                        HourlyCostRate = rm.HourlyCostRate,
                        FixedCostAmount = rm.FixedCostAmount
                    })
                    .ToList() ?? new List<ProjectResourceManagerDto>(),
                TeamMembers = project.ProjectAssignments
                    .Where(a => a.IsActive)
                    .OrderBy(a => a.TeamMember.User.FirstName)
                    .ThenBy(a => a.TeamMember.User.LastName)
                    .Select(MapAssignment)
                    .ToList(),
                UsesMilestones = project.UsesMilestones,
                MilestoneCount = project.MilestoneCount,
                AssignTeamBySkill = project.AssignTeamBySkill,
                Milestones = project.ProjectMilestones?
                    .Where(m => !m.IsDeleted)
                    .OrderBy(m => m.Order)
                    .ThenBy(m => m.Name)
                    .Select(MapMilestone)
                    .ToList() ?? new List<ProjectMilestoneDto>(),
                SalesId = project.SalesId,
                SalesPersonName = project.SalesUser is not null
                    ? UserDisplayName.FromUser(project.SalesUser)
                    : string.Empty,
                CommissionType = project.CommissionType,
                CommissionValue = project.CommissionValue,
                CalculatedCommissionAmount = CalculateCommissionAmount(project)
            };
        }

        private static decimal? CalculateCommissionAmount(Project project)
        {
            if (!project.SalesId.HasValue
                || !project.CommissionType.HasValue
                || !project.CommissionValue.HasValue)
            {
                return null;
            }

            if (project.CommissionType == CommissionType.Fixed)
                return project.CommissionValue;

            if (!project.Budget.HasValue)
                return null;

            return Math.Round(
                project.Budget.Value * project.CommissionValue.Value / 100m,
                2,
                MidpointRounding.AwayFromZero);
        }

        private static SalesProjectSummaryDto MapSalesProjectSummary(Project project)
        {
            return new SalesProjectSummaryDto
            {
                Id = project.Id,
                Name = project.Name,
                Description = ProjectDescriptionSkills.StripSkillsMarker(project.Description),
                ClientName = ResolveProjectClientName(project),
                ClientMemberName = ResolveProjectClientMemberName(project),
                Status = project.Status,
                TeamMemberNames = project.ProjectAssignments
                    .Where(a => a.IsActive)
                    .OrderBy(a => a.TeamMember.User.FirstName)
                    .ThenBy(a => a.TeamMember.User.LastName)
                    .Select(a => UserDisplayName.FromTeamMember(a.TeamMember))
                    .ToList(),
                CommissionType = project.CommissionType,
                CommissionValue = project.CommissionValue,
                CalculatedCommissionAmount = CalculateCommissionAmount(project)
            };
        }

        private static void ValidateSalesAssignment(
            int? salesId,
            CommissionType? commissionType,
            decimal? commissionValue)
        {
            if (!salesId.HasValue)
                return;

            if (!commissionType.HasValue || !commissionValue.HasValue)
                throw new AppException("Commission type and value are required when a sales person is assigned.", 400);

            if (commissionValue.Value <= 0)
                throw new AppException("Commission value must be greater than zero.", 400);

            if (commissionType == CommissionType.Percentage && commissionValue.Value > 100)
                throw new AppException("Commission percentage cannot exceed 100.", 400);
        }

        public async Task<ProjectDto> UpdateProjectSalesAssignmentAsync(
            int projectId,
            UpdateProjectSalesAssignmentDto dto)
        {
            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null)
                throw new AppException("Resource not found.", 404);

            if (!dto.SalesId.HasValue)
            {
                project.SalesId = null;
                project.CommissionType = null;
                project.CommissionValue = null;
            }
            else
            {
                ValidateSalesAssignment(dto.SalesId, dto.CommissionType, dto.CommissionValue);
                project.SalesId = dto.SalesId;
                project.CommissionType = dto.CommissionType;
                project.CommissionValue = dto.CommissionValue;
            }

            project.UpdatedAt = DateTime.UtcNow;
            _projectRepo.SaveInclude(
                project,
                nameof(project.SalesId),
                nameof(project.CommissionType),
                nameof(project.CommissionValue),
                nameof(project.UpdatedAt));
            await _projectRepo.SaveChangesAsync();

            return await GetProjectByIdAsync(projectId);
        }

        public async Task<PagedResponse<SalesProjectSummaryDto>> GetSalesProjectsByUserIdAsync(
            int userId,
            ProjectFilterRequest request)
        {
            request.SalesId = userId;
            var query = BuildProjectQuery();
            query = await ApplyFiltersAsync(query, request);

            var totalCount = await query.CountAsync();
            var projects = await query
                .OrderByDescending(p => p.StartDate)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<SalesProjectSummaryDto>(
                projects.Select(MapSalesProjectSummary).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<SalesProjectSummaryDto> GetSalesProjectByIdAsync(int userId, int projectId)
        {
            var project = await BuildProjectQuery()
                .FirstOrDefaultAsync(p => p.Id == projectId && p.SalesId == userId);

            if (project is null)
                throw new AppException("Resource not found.", 404);

            return MapSalesProjectSummary(project);
        }

        private static ProjectMilestoneDto MapMilestone(ProjectMilestone milestone)
            => new()
            {
                Id = milestone.Id,
                ProjectId = milestone.ProjectId,
                Name = milestone.Name,
                Description = milestone.Description,
                Order = milestone.Order,
                PaymentPercentage = milestone.PaymentPercentage,
                PaymentAmount = milestone.PaymentAmount,
                StartDate = milestone.StartDate,
                EndDate = milestone.EndDate,
                Status = milestone.Status
            };

        private async Task<ProjectDto> GetProjectDtoByIdAsync(int id)
        {
            await ConsolidateDuplicateActiveAssignmentsForProjectAsync(id);

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

            var selectedIdSet = selectedIds.ToHashSet();

            var existing = await _projectSkillRepo
                .GetAll(ps => ps.ProjectId == projectId)
                .ToListAsync();

            var removedSkillIds = existing
                .Where(row => row.IsSelected && !selectedIdSet.Contains(row.SkillId))
                .Select(row => row.SkillId)
                .ToList();

            foreach (var row in existing)
            {
                var shouldSelect = selectedIdSet.Contains(row.SkillId);
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

            if (removedSkillIds.Count > 0)
                await DeactivateAssignmentsForSkillsAsync(projectId, removedSkillIds);
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

        private async Task EnsureTeamMemberManagedByUserAsync(int resourceManagerUserId, int teamMemberId)
        {
            var managed = await _teamMemberRepo
                .Query()
                .AnyAsync(t =>
                    t.Id == teamMemberId
                    && !t.IsDeleted
                    && t.ResourceManagerId == resourceManagerUserId);

            if (!managed)
                throw new AppException("You do not have access to this team member.", 403);
        }

        private async Task EnsureProjectAccessibleToResourceManagerAsync(int resourceManagerUserId, int projectId)
        {
            var isAssignedToProject = await _projectResourceManagerRepo
                .GetAll(r =>
                    r.ProjectId == projectId
                    && r.IsActive
                    && !r.IsDeleted
                    && r.ResourceManagerUserId == resourceManagerUserId)
                .AnyAsync();

            if (isAssignedToProject)
                return;

            var hasManagedMember = await _projectAssignmentRepo
                .GetAll(a =>
                    a.ProjectId == projectId
                    && a.IsActive
                    && a.TeamMember.ResourceManagerId == resourceManagerUserId
                    && !a.TeamMember.IsDeleted)
                .AnyAsync();

            if (!hasManagedMember)
                throw new AppException("You do not have access to this project.", 403);
        }

        private async Task ValidateResourceManagerUsersAsync(IReadOnlyCollection<int> userIds)
        {
            if (userIds.Count == 0)
                return;

            var validCount = await _userRepo
                .Query()
                .Include(u => u.Role)
                .CountAsync(u =>
                    userIds.Contains(u.Id)
                    && u.IsActive
                    && !u.IsDeleted
                    && u.Role != null
                    && u.Role.Name == nameof(UserRole.ResourceManager));

            if (validCount != userIds.Count)
                throw new AppException("One or more resource managers are invalid.", 400);
        }

        private static ProjectDto MapProjectForResourceManagerUser(ProjectDto project, int userId)
        {
            var dto = StripFinancials(project);
            var rm = dto.ResourceManagers?.FirstOrDefault(r => r.UserId == userId);
            dto.MyHourlyCostRate = rm?.HourlyCostRate;
            dto.MyFixedCostAmount = rm?.FixedCostAmount;

            if (dto.ResourceManagers is null)
                return dto;

            foreach (var other in dto.ResourceManagers.Where(r => r.UserId != userId))
            {
                other.HourlyCostRate = null;
                other.FixedCostAmount = null;
            }

            return dto;
        }

        private static ProjectDto StripFinancials(ProjectDto project)
        {
            project.Budget = null;
            project.HourlyRate = null;
            project.ExpectedHours = null;
            StripAssignmentFinancials(project);
            StripMilestoneFinancials(project);
            return project;
        }

        private static ProjectDto StripTeamMemberFinancials(ProjectDto project)
        {
            project.Budget = null;
            project.HourlyRate = null;
            project.ExpectedHours = null;
            StripAssignmentFinancials(project);
            StripMilestoneFinancials(project);
            StripResourceManagers(project);
            StripAssignmentResourceManagerIds(project);
            return project;
        }

        private static ProjectDto StripClientPortalFinancials(ProjectDto project)
        {
            StripAssignmentFinancials(project);
            StripMilestoneFinancials(project);
            // Keep UsesMilestones so client payment UI can scope invoices per phase.
            project.Milestones = new List<ProjectMilestoneDto>();
            StripResourceManagers(project);
            StripAssignmentResourceManagerIds(project);
            return project;
        }

        private static void StripResourceManagers(ProjectDto project)
        {
            project.ResourceManagers = new List<ProjectResourceManagerDto>();
            project.MyHourlyCostRate = null;
            project.MyFixedCostAmount = null;
        }

        private static void StripAssignmentResourceManagerIds(ProjectDto project)
        {
            foreach (var assignment in project.TeamMembers)
                assignment.ResourceManagerId = null;
        }

        private static void StripAssignmentFinancials(ProjectDto project)
        {
            foreach (var assignment in project.TeamMembers)
            {
                assignment.HourlyRate = null;
                assignment.AllocatedHours = null;
            }
        }

        private static void StripMilestoneFinancials(ProjectDto project)
        {
            foreach (var milestone in project.Milestones)
            {
                milestone.PaymentAmount = 0;
                milestone.PaymentPercentage = 0;
            }
        }

        private static ProjectAssignmentDto MapAssignment(ProjectAssignment assignment)
        {
            var skillId = assignment.SkillId ?? ProjectDescriptionSkills.SkillIdFromRole(assignment.Role);
            return new ProjectAssignmentDto
            {
                Id = assignment.Id,
                TeamMemberId = assignment.TeamMemberId,
                ResourceManagerId = assignment.TeamMember?.ResourceManagerId,
                TeamMemberName = UserDisplayName.FromTeamMember(assignment.TeamMember),
                TeamMemberTitle = assignment.TeamMember?.Title ?? string.Empty,
                Role = ProjectDescriptionSkills.StripSkillPrefixFromRole(assignment.Role),
                SkillId = skillId,
                AssignedDate = assignment.AssignedDate,
                HourlyRate = assignment.HourlyRate,
                AllocatedHours = assignment.AllocatedHours
            };
        }

        private static int? ResolveAssignmentSkillId(ProjectAssignment assignment)
            => assignment.SkillId ?? ProjectDescriptionSkills.SkillIdFromRole(assignment.Role);

        private static bool AssignmentMatchesSkill(ProjectAssignment assignment, int? skillId)
        {
            var resolved = ResolveAssignmentSkillId(assignment);
            if (skillId is > 0)
                return resolved == skillId;

            return resolved is null;
        }

        private async Task<List<ProjectAssignment>> GetAllAssignmentsForMemberAsync(
            int projectId,
            int teamMemberId)
        {
            return await _projectAssignmentRepo
                .Query()
                .IgnoreQueryFilters()
                .Where(a =>
                    a.ProjectId == projectId
                    && a.TeamMemberId == teamMemberId
                    && !a.IsDeleted)
                .ToListAsync();
        }

        private static ProjectAssignment? PickBestAssignment(
            IEnumerable<ProjectAssignment> assignments,
            int? skillId)
        {
            var candidates = assignments.ToList();
            if (candidates.Count == 0)
                return null;

            var matched = candidates
                .Where(a => AssignmentMatchesSkill(a, skillId))
                .OrderByDescending(a => a.AssignedDate)
                .ThenByDescending(a => a.Id)
                .FirstOrDefault();

            if (matched is not null)
                return matched;

            if (skillId is > 0)
            {
                return candidates
                    .Where(a => ResolveAssignmentSkillId(a) is null)
                    .OrderByDescending(a => a.AssignedDate)
                    .ThenByDescending(a => a.Id)
                    .FirstOrDefault();
            }

            return candidates
                .OrderByDescending(a => a.AssignedDate)
                .ThenByDescending(a => a.Id)
                .FirstOrDefault();
        }

        private async Task ConsolidateDuplicateActiveAssignmentsInMemoryAsync(List<ProjectAssignment> assignments)
        {
            var actives = assignments.Where(a => a.IsActive).ToList();
            if (actives.Count <= 1)
                return;

            var keeper = actives
                .OrderByDescending(a => a.SkillId.HasValue ? 1 : 0)
                .ThenByDescending(a => a.AssignedDate)
                .ThenByDescending(a => a.Id)
                .First();

            var changed = false;
            foreach (var extra in actives.Where(a => a.Id != keeper.Id))
            {
                DeactivateAssignment(extra);
                changed = true;
            }

            if (changed)
                await _projectAssignmentRepo.SaveChangesAsync();
        }

        private async Task<ProjectAssignment?> FindAssignmentAsync(
            int projectId,
            int teamMemberId,
            int? skillId)
        {
            var assignments = await GetAllAssignmentsForMemberAsync(projectId, teamMemberId);
            return PickBestAssignment(assignments, skillId);
        }

        private async Task<List<ProjectAssignment>> GetActiveAssignmentsForMemberAsync(
            int projectId,
            int teamMemberId)
        {
            return await _projectAssignmentRepo
                .GetAll(a => a.ProjectId == projectId && a.TeamMemberId == teamMemberId && a.IsActive)
                .ToListAsync();
        }

        private async Task ConsolidateDuplicateActiveAssignmentsForMemberAsync(int projectId, int teamMemberId)
        {
            var all = await GetAllAssignmentsForMemberAsync(projectId, teamMemberId);
            await ConsolidateDuplicateActiveAssignmentsInMemoryAsync(all);
        }

        private async Task ConsolidateDuplicateActiveAssignmentsForProjectAsync(int projectId)
        {
            var actives = await _projectAssignmentRepo
                .Query()
                .IgnoreQueryFilters()
                .Where(a => a.ProjectId == projectId && a.IsActive && !a.IsDeleted)
                .ToListAsync();

            var changed = false;
            foreach (var group in actives.GroupBy(a => a.TeamMemberId).Where(g => g.Count() > 1))
            {
                var keeper = group
                    .OrderByDescending(a => a.SkillId.HasValue ? 1 : 0)
                    .ThenByDescending(a => a.AssignedDate)
                    .ThenByDescending(a => a.Id)
                    .First();

                foreach (var extra in group.Where(a => a.Id != keeper.Id))
                {
                    DeactivateAssignment(extra);
                    changed = true;
                }
            }

            if (changed)
                await _projectAssignmentRepo.SaveChangesAsync();
        }

        private void ReactivateAssignment(
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
            _projectAssignmentRepo.SaveInclude(
                assignment,
                nameof(assignment.IsActive),
                nameof(assignment.UnassignedDate),
                nameof(assignment.AssignedDate),
                nameof(assignment.SkillId),
                nameof(assignment.Role),
                nameof(assignment.HourlyRate),
                nameof(assignment.AllocatedHours),
                nameof(assignment.UpdatedAt));
        }

        private async Task DeactivateAssignmentsForSkillsAsync(int projectId, IReadOnlyList<int> skillIds)
        {
            if (skillIds.Count == 0)
                return;

            var skillIdSet = skillIds.ToHashSet();
            var assignments = await _projectAssignmentRepo
                .Query()
                .IgnoreQueryFilters()
                .Where(a => a.ProjectId == projectId && a.IsActive && !a.IsDeleted)
                .ToListAsync();

            var changed = false;
            foreach (var assignment in assignments)
            {
                var resolvedSkillId = assignment.SkillId ?? ProjectDescriptionSkills.SkillIdFromRole(assignment.Role);
                if (resolvedSkillId.HasValue && skillIdSet.Contains(resolvedSkillId.Value))
                {
                    DeactivateAssignment(assignment);
                    changed = true;
                }
            }

            if (changed)
                await _projectAssignmentRepo.SaveChangesAsync();
        }

        private async Task DeactivateAssignmentsForResourceManagersAsync(
            int projectId,
            IReadOnlyList<int> resourceManagerUserIds)
        {
            if (resourceManagerUserIds.Count == 0)
                return;

            var rmSet = resourceManagerUserIds.ToHashSet();
            var assignments = await _projectAssignmentRepo
                .Query()
                .IgnoreQueryFilters()
                .Include(a => a.TeamMember)
                .Where(a =>
                    a.ProjectId == projectId
                    && a.IsActive
                    && !a.IsDeleted
                    && a.TeamMember != null
                    && a.TeamMember.ResourceManagerId.HasValue
                    && rmSet.Contains(a.TeamMember.ResourceManagerId.Value))
                .ToListAsync();

            if (assignments.Count == 0)
                return;

            foreach (var assignment in assignments)
                DeactivateAssignment(assignment);

            await _projectAssignmentRepo.SaveChangesAsync();
        }

        private async Task EnsureMemberResourceManagerOnProjectAsync(int projectId, int teamMemberId)
        {
            var member = await _teamMemberRepo
                .Query()
                .Include(t => t.ResourceManager)
                .FirstOrDefaultAsync(t => t.Id == teamMemberId && !t.IsDeleted);

            if (member is null)
                throw new AppException("Resource not found.", 404);

            if (!member.ResourceManagerId.HasValue)
                return;

            var rmRow = await _projectResourceManagerRepo
                .Query()
                .FirstOrDefaultAsync(r =>
                    r.ProjectId == projectId
                    && r.ResourceManagerUserId == member.ResourceManagerId.Value
                    && r.IsActive
                    && !r.IsDeleted);

            if (rmRow is not null)
                return;

            var rmName = member.ResourceManager != null
                ? UserDisplayName.FromUser(member.ResourceManager)
                : "the resource manager";
            throw new AppException($"Assign {rmName} to this project before assigning their team members.", 400);
        }

        private async Task<decimal> ResolveHourlyAssignmentCostRateAsync(
            int projectId,
            int teamMemberId,
            decimal? requestedRate)
        {
            var member = await _teamMemberRepo
                .Query()
                .FirstOrDefaultAsync(t => t.Id == teamMemberId && !t.IsDeleted);

            if (member is null)
                throw new AppException("Resource not found.", 404);

            if (member.ResourceManagerId.HasValue)
            {
                var rmRow = await _projectResourceManagerRepo
                    .Query()
                    .Include(r => r.ResourceManager)
                    .FirstOrDefaultAsync(r =>
                        r.ProjectId == projectId
                        && r.ResourceManagerUserId == member.ResourceManagerId.Value
                        && r.IsActive
                        && !r.IsDeleted);

                if (rmRow is not null)
                {
                    if (rmRow.HourlyCostRate is > 0)
                        return rmRow.HourlyCostRate.Value;

                    var rmName = rmRow.ResourceManager != null
                        ? UserDisplayName.FromUser(rmRow.ResourceManager)
                        : "the resource manager";
                    throw new AppException($"Set a rate for {rmName} on this project first.", 400);
                }

                var memberRmName = member.ResourceManager != null
                    ? UserDisplayName.FromUser(member.ResourceManager)
                    : "the resource manager";
                throw new AppException($"Assign {memberRmName} to this project before assigning their team members.", 400);
            }

            if (requestedRate is > 0)
                return requestedRate.Value;

            throw new AppException("Enter a cost rate for this team member.", 400);
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
