using Microsoft.EntityFrameworkCore;
using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.Dashboard;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities.Enum;
using Client = OffshoreManagementSystem.Domain.Entities.Client;
using Project = OffshoreManagementSystem.Domain.Entities.Project;
using ServiceRequest = OffshoreManagementSystem.Domain.Entities.ServiceRequest;
using TeamMember = OffshoreManagementSystem.Domain.Entities.TeamMember;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class DashboardStatisticsService : IDashboardStatisticsService
    {
        private readonly IRepository<ServiceRequest> _requestRepo;
        private readonly IRepository<Project> _projectRepo;
        private readonly IRepository<Client> _clientRepo;
        private readonly IRepository<TeamMember> _teamMemberRepo;
        private readonly IRepository<ProjectAssignment> _assignmentRepo;

        public DashboardStatisticsService(
            IRepository<ServiceRequest> requestRepo,
            IRepository<Project> projectRepo,
            IRepository<Client> clientRepo,
            IRepository<TeamMember> teamMemberRepo,
            IRepository<ProjectAssignment> assignmentRepo)
        {
            _requestRepo = requestRepo;
            _projectRepo = projectRepo;
            _clientRepo = clientRepo;
            _teamMemberRepo = teamMemberRepo;
            _assignmentRepo = assignmentRepo;
        }

        public async Task<AdminDashboardStatisticsDto> GetAdminStatisticsAsync()
        {
            var requests = await _requestRepo
                .GetAll(r => !r.IsDeleted)
                .AsNoTracking()
                .ToListAsync();

            var projects = await _projectRepo
                .GetAll(p => !p.IsDeleted)
                .AsNoTracking()
                .ToListAsync();

            var team = await _teamMemberRepo
                .GetAll(t => !t.IsDeleted)
                .AsNoTracking()
                .ToListAsync();

            var totalClients = await _clientRepo
                .GetAll(c => !c.IsDeleted && c.IsActive)
                .AsNoTracking()
                .CountAsync();

            var available = team.Count(t => t.IsAvailable);
            var busy = team.Count - available;

            return new AdminDashboardStatisticsDto
            {
                TotalClients = totalClients,
                TotalRequests = requests.Count,
                TotalProjects = projects.Count,
                AvailableTeamMembers = available,
                BusyTeamMembers = busy,
                RequestsByStatus = GroupRequestStatus(requests),
                ProjectsByStatus = GroupProjectStatus(projects),
                TeamAvailability = new List<ChartCountItemDto>
                {
                    new() { Label = "Available", Count = available },
                    new() { Label = "Busy", Count = busy },
                },
                RequestsByMonth = GroupByMonth(requests.Select(r => r.CreatedAt).ToList()),
            };
        }

        public async Task<ClientDashboardStatisticsDto> GetClientStatisticsAsync(int userId)
        {
            var clientId = await GetClientIdForUserAsync(userId);

            var requests = await _requestRepo
                .GetAll(r => !r.IsDeleted && r.ClientId == clientId)
                .AsNoTracking()
                .ToListAsync();

            var projectIds = await _projectRepo
                .GetAll(p => !p.IsDeleted)
                .AsNoTracking()
                .Include(p => p.ServiceRequest)
                .Where(p => p.ServiceRequest != null && p.ServiceRequest.ClientId == clientId)
                .Select(p => p.Id)
                .ToListAsync();

            var projects = await _projectRepo
                .GetAll(p => !p.IsDeleted && projectIds.Contains(p.Id))
                .AsNoTracking()
                .ToListAsync();

            return new ClientDashboardStatisticsDto
            {
                TotalRequests = requests.Count,
                ActiveProjects = projects.Count(p => p.Status == ProjectStatus.InProgress),
                CompletedProjects = projects.Count(p => p.Status == ProjectStatus.Completed),
                RequestsByStatus = GroupRequestStatus(requests),
                ProjectsByStatus = GroupProjectStatus(projects),
                RequestsByMonth = GroupByMonth(requests.Select(r => r.CreatedAt).ToList()),
            };
        }

        public async Task<TeamDashboardStatisticsDto> GetTeamStatisticsAsync(int userId)
        {
            var teamMemberId = await GetTeamMemberIdForUserAsync(userId);

            var member = await _teamMemberRepo
                .GetAll(t => t.Id == teamMemberId && !t.IsDeleted)
                .AsNoTracking()
                .Include(t => t.TeamMemberSkills)
                .FirstOrDefaultAsync();

            if (member is null)
                throw new AppException("Team member profile not found for current user.", 404);

            var assignments = await _assignmentRepo
                .GetAll(a => a.IsActive && !a.IsDeleted && a.TeamMemberId == teamMemberId)
                .AsNoTracking()
                .Include(a => a.Project)
                .Where(a => a.Project != null && !a.Project.IsDeleted)
                .ToListAsync();

            var projects = assignments
                .Select(a => a.Project!)
                .GroupBy(p => p.Id)
                .Select(g => g.First())
                .ToList();

            var hoursByProject = assignments
                .GroupBy(a => a.ProjectId)
                .Select(g => new ChartCountItemDto
                {
                    Label = g.First().Project?.Name ?? $"Project #{g.Key}",
                    Count = g.Sum(a => a.AllocatedHours ?? 0),
                })
                .Where(x => x.Count > 0)
                .OrderByDescending(x => x.Count)
                .Take(6)
                .ToList();

            return new TeamDashboardStatisticsDto
            {
                TotalAssignedProjects = projects.Count,
                InProgressProjects = projects.Count(p => p.Status == ProjectStatus.InProgress),
                CompletedProjects = projects.Count(p => p.Status == ProjectStatus.Completed),
                SkillsCount = member.TeamMemberSkills?.Count(ts => !ts.IsDeleted) ?? 0,
                ProjectsByStatus = GroupProjectStatus(projects),
                HoursByProject = hoursByProject,
            };
        }

        private static List<ChartCountItemDto> GroupRequestStatus(IEnumerable<ServiceRequest> requests)
        {
            return Enum.GetValues<ServiceRequestStatus>()
                .Select(status => new ChartCountItemDto
                {
                    Label = FormatRequestStatus(status),
                    Count = requests.Count(r => r.Status == status),
                })
                .Where(x => x.Count > 0)
                .ToList();
        }

        private static List<ChartCountItemDto> GroupProjectStatus(IEnumerable<Project> projects)
        {
            return Enum.GetValues<ProjectStatus>()
                .Select(status => new ChartCountItemDto
                {
                    Label = FormatProjectStatus(status),
                    Count = projects.Count(p => p.Status == status),
                })
                .Where(x => x.Count > 0)
                .ToList();
        }

        private static List<ChartCountItemDto> GroupByMonth(IReadOnlyList<DateTime> dates)
        {
            var start = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc)
                .AddMonths(-5);

            var buckets = Enumerable.Range(0, 6)
                .Select(i => start.AddMonths(i))
                .ToList();

            return buckets
                .Select(monthStart => new ChartCountItemDto
                {
                    Label = monthStart.ToString("MMM yyyy"),
                    Count = dates.Count(d =>
                        d.Year == monthStart.Year && d.Month == monthStart.Month),
                })
                .ToList();
        }

        private static string FormatRequestStatus(ServiceRequestStatus status) => status switch
        {
            ServiceRequestStatus.Pending => "Pending",
            ServiceRequestStatus.InProgress => "In Progress",
            ServiceRequestStatus.Completed => "Completed",
            ServiceRequestStatus.Cancelled => "Cancelled",
            _ => status.ToString(),
        };

        private static string FormatProjectStatus(ProjectStatus status) => status switch
        {
            ProjectStatus.Pending => "Pending",
            ProjectStatus.InProgress => "In Progress",
            ProjectStatus.Completed => "Completed",
            ProjectStatus.OnHold => "On Hold",
            ProjectStatus.Cancelled => "Cancelled",
            _ => status.ToString(),
        };

        private async Task<int> GetClientIdForUserAsync(int userId)
        {
            var client = await _clientRepo
                .GetAll(c => !c.IsDeleted && c.IsActive && c.UserId == userId)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (client is null)
                throw new AppException("Client profile not found for current user.", 404);

            return client.Id;
        }

        private async Task<int> GetTeamMemberIdForUserAsync(int userId)
        {
            var member = await _teamMemberRepo
                .GetAll(t =>
                    !t.IsDeleted
                    && t.UserId == userId
                    && t.User.IsActive
                    && !t.User.IsDeleted)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (member is null)
                throw new AppException("Team member profile not found for current user.", 404);

            return member.Id;
        }
    }
}
