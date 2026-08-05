using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.ClientManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Domain.Entities;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ClientTeamBrowseService : IClientTeamBrowseService
    {
        private readonly IRepository<Client> _clientRepo;
        private readonly IRepository<Project> _projectRepo;
        private readonly IRepository<ProjectAssignment> _assignmentRepo;
        private readonly IRepository<TeamMember> _teamMemberRepo;
        private readonly ITeamProfileStorageService _photoStorage;
        private readonly ITeamIntroVideoStorageService _introVideoStorage;
        private readonly IClientAccessService _clientAccess;

        public ClientTeamBrowseService(
            IRepository<Client> clientRepo,
            IRepository<Project> projectRepo,
            IRepository<ProjectAssignment> assignmentRepo,
            IRepository<TeamMember> teamMemberRepo,
            ITeamProfileStorageService photoStorage,
            ITeamIntroVideoStorageService introVideoStorage,
            IClientAccessService clientAccess)
        {
            _clientRepo = clientRepo;
            _projectRepo = projectRepo;
            _assignmentRepo = assignmentRepo;
            _teamMemberRepo = teamMemberRepo;
            _photoStorage = photoStorage;
            _introVideoStorage = introVideoStorage;
            _clientAccess = clientAccess;
        }

        public async Task<PagedResponse<ClientTeamMemberCardDto>> BrowseTeamMembersAsync(
            int clientUserId,
            ClientTeamMemberBrowseRequest request)
        {
            var accessibleClientIds = await _clientAccess.GetAccessibleClientIdsForUserAsync(clientUserId);
            var projectQuery = _projectRepo
                .Query()
                .AsNoTracking()
                .Where(p => !p.IsDeleted
                    && ((p.ClientId.HasValue && accessibleClientIds.Contains(p.ClientId.Value))
                        || (p.ServiceRequest != null && accessibleClientIds.Contains(p.ServiceRequest.ClientId))));

            if (request.ProjectId.HasValue)
                projectQuery = projectQuery.Where(p => p.Id == request.ProjectId.Value);

            var projects = await projectQuery
                .Select(p => new { p.Id, p.Name })
                .ToListAsync();

            if (projects.Count == 0)
            {
                return new PagedResponse<ClientTeamMemberCardDto>(
                    Array.Empty<ClientTeamMemberCardDto>(),
                    0,
                    GetPageIndex(request),
                    GetPageSize(request));
            }

            var projectIds = projects.Select(p => p.Id).ToHashSet();
            var projectNameById = projects.ToDictionary(p => p.Id, p => p.Name);

            var memberProjectMap = await _assignmentRepo
                .Query()
                .AsNoTracking()
                .Where(a => projectIds.Contains(a.ProjectId) && a.IsActive && !a.IsDeleted)
                .Select(a => new { a.TeamMemberId, a.ProjectId })
                .ToListAsync();

            var memberIds = memberProjectMap.Select(x => x.TeamMemberId).Distinct().ToList();
            if (memberIds.Count == 0)
            {
                return new PagedResponse<ClientTeamMemberCardDto>(
                    Array.Empty<ClientTeamMemberCardDto>(),
                    0,
                    GetPageIndex(request),
                    GetPageSize(request));
            }

            var query = _teamMemberRepo
                .Query()
                .AsNoTracking()
                .Include(t => t.User)
                .Include(t => t.TeamMemberSkills)
                    .ThenInclude(ts => ts.Skill)
                .Where(t => memberIds.Contains(t.Id) && !t.IsDeleted && t.User.IsActive && !t.User.IsDeleted);

            if (!string.IsNullOrWhiteSpace(request.SkillSearch))
            {
                var term = request.SkillSearch.Trim();
                query = query.Where(t =>
                    t.TeamMemberSkills.Any(ts =>
                        ts.Skill != null
                        && ts.Skill.Name.Contains(term)));
            }

            query = TeamMemberBrowseFilters.ApplyNameSearch(query, request.NameSearch);
            query = TeamMemberBrowseFilters.ApplyExperienceBand(query, request.ExperienceBand);

            var total = await query.CountAsync();
            var members = await query
                .OrderBy(t => t.User.LastName)
                .ThenBy(t => t.User.FirstName)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            var cards = members.Select(member =>
            {
                var assignedProjectIds = memberProjectMap
                    .Where(x => x.TeamMemberId == member.Id)
                    .Select(x => x.ProjectId)
                    .Distinct();

                return new ClientTeamMemberCardDto
                {
                    Id = member.Id,
                    FullName = UserDisplayName.FromTeamMember(member),
                    Title = member.Title,
                    YearsOfExperience = member.YearsOfExperience,
                    ProfilePhotoUrl = string.IsNullOrWhiteSpace(member.ProfilePhoto)
                        ? null
                        : _photoStorage.GetPhotoPublicUrl(member.ProfilePhoto),
                    Skills = member.TeamMemberSkills
                        .OrderBy(s => s.Skill?.Name)
                        .Select(s => s.Skill?.Name ?? string.Empty)
                        .Where(name => !string.IsNullOrWhiteSpace(name))
                        .Distinct()
                        .ToList(),
                    ProjectNames = assignedProjectIds
                        .Select(id => projectNameById.TryGetValue(id, out var name) ? name : string.Empty)
                        .Where(name => !string.IsNullOrWhiteSpace(name))
                        .Distinct()
                        .OrderBy(name => name)
                        .ToList()
                };
            }).ToList();

            return new PagedResponse<ClientTeamMemberCardDto>(
                cards,
                total,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<ClientTeamMemberDetailDto> GetTeamMemberDetailAsync(int clientUserId, int teamMemberId)
        {
            var accessibleClientIds = await _clientAccess.GetAccessibleClientIdsForUserAsync(clientUserId);

            var hasAccess = await _assignmentRepo
                .Query()
                .AsNoTracking()
                .AnyAsync(a =>
                    a.TeamMemberId == teamMemberId
                    && a.IsActive
                    && !a.IsDeleted
                    && !a.Project.IsDeleted
                    && ((a.Project.ClientId.HasValue && accessibleClientIds.Contains(a.Project.ClientId.Value))
                        || (a.Project.ServiceRequest != null
                            && accessibleClientIds.Contains(a.Project.ServiceRequest.ClientId))));

            if (!hasAccess)
                throw new AppException("Team member not found on your projects.", 404);

            var projectNames = await _assignmentRepo
                .Query()
                .AsNoTracking()
                .Where(a =>
                    a.TeamMemberId == teamMemberId
                    && a.IsActive
                    && !a.IsDeleted
                    && !a.Project.IsDeleted
                    && ((a.Project.ClientId.HasValue && accessibleClientIds.Contains(a.Project.ClientId.Value))
                        || (a.Project.ServiceRequest != null
                            && accessibleClientIds.Contains(a.Project.ServiceRequest.ClientId))))
                .Select(a => a.Project.Name)
                .Distinct()
                .OrderBy(name => name)
                .ToListAsync();

            return await MapMemberDetailAsync(teamMemberId, projectNames);
        }

        public async Task<PagedResponse<ClientTeamMemberCardDto>> BrowseShowcaseTeamMembersAsync(
            ClientTeamMemberBrowseRequest request)
        {
            var query = _teamMemberRepo
                .Query()
                .AsNoTracking()
                .Include(t => t.User)
                .Include(t => t.TeamMemberSkills)
                    .ThenInclude(ts => ts.Skill)
                .Where(t => !t.IsDeleted && t.User.IsActive && !t.User.IsDeleted);

            query = TeamMemberBrowseFilters.ApplyNameSearch(query, request.NameSearch);
            query = TeamMemberBrowseFilters.ApplySkillSearch(query, request.SkillSearch);
            query = TeamMemberBrowseFilters.ApplyExperienceBand(query, request.ExperienceBand);

            var total = await query.CountAsync();
            var members = await query
                .OrderBy(t => t.User.LastName)
                .ThenBy(t => t.User.FirstName)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            var cards = members.Select(member => new ClientTeamMemberCardDto
            {
                Id = member.Id,
                FullName = UserDisplayName.FromTeamMember(member),
                Title = member.Title,
                YearsOfExperience = member.YearsOfExperience,
                ProfilePhotoUrl = string.IsNullOrWhiteSpace(member.ProfilePhoto)
                    ? null
                    : _photoStorage.GetPhotoPublicUrl(member.ProfilePhoto),
                Skills = member.TeamMemberSkills
                    .OrderBy(s => s.Skill?.Name)
                    .Select(s => s.Skill?.Name ?? string.Empty)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Distinct()
                    .ToList(),
                // Showcase hides other clients' project names.
                ProjectNames = new List<string>()
            }).ToList();

            return new PagedResponse<ClientTeamMemberCardDto>(
                cards,
                total,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<ClientTeamMemberDetailDto> GetShowcaseTeamMemberDetailAsync(int teamMemberId)
        {
            return await MapMemberDetailAsync(teamMemberId, new List<string>());
        }

        private async Task<ClientTeamMemberDetailDto> MapMemberDetailAsync(
            int teamMemberId,
            List<string> projectNames)
        {
            var member = await _teamMemberRepo
                .Query()
                .AsNoTracking()
                .Include(t => t.User)
                .Include(t => t.TeamMemberSkills)
                    .ThenInclude(ts => ts.Skill)
                .Include(t => t.Certificates.Where(c => !c.IsDeleted))
                .Include(t => t.Experiences.Where(e => !e.IsDeleted))
                .FirstOrDefaultAsync(t => t.Id == teamMemberId && !t.IsDeleted && t.User.IsActive);

            if (member is null)
                throw new AppException("Team member not found.", 404);

            return new ClientTeamMemberDetailDto
            {
                Id = member.Id,
                FullName = UserDisplayName.FromTeamMember(member),
                Title = member.Title,
                YearsOfExperience = member.YearsOfExperience,
                ProfilePhotoUrl = string.IsNullOrWhiteSpace(member.ProfilePhoto)
                    ? null
                    : _photoStorage.GetPhotoPublicUrl(member.ProfilePhoto),
                IntroVideoUrl = string.IsNullOrWhiteSpace(member.IntroVideo)
                    ? null
                    : _introVideoStorage.GetIntroVideoPublicUrl(member.IntroVideo),
                Skills = member.TeamMemberSkills
                    .OrderBy(s => s.Skill?.Name)
                    .Select(s => s.Skill?.Name ?? string.Empty)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Distinct()
                    .ToList(),
                ProjectNames = projectNames,
                Certificates = member.Certificates
                    .OrderByDescending(c => c.IssuedDate)
                    .Select(c => new ClientTeamMemberCertificateDto
                    {
                        Name = c.Name,
                        Issuer = c.Issuer,
                        IssuedDate = c.IssuedDate,
                        ExpiryDate = c.ExpiryDate
                    })
                    .ToList(),
                Experiences = member.Experiences
                    .OrderByDescending(e => e.StartDate)
                    .Select(e => new ClientTeamMemberExperienceDto
                    {
                        JobTitle = e.JobTitle,
                        Company = e.Company,
                        StartDate = e.StartDate,
                        EndDate = e.EndDate,
                        Description = e.Description
                    })
                    .ToList()
            };
        }

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

        private static int GetPageIndex(ClientTeamMemberBrowseRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(ClientTeamMemberBrowseRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(ClientTeamMemberBrowseRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);
    }
}
