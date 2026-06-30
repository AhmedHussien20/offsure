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
    public class SalesTeamBrowseService : ISalesTeamBrowseService
    {
        private readonly IRepository<Project> _projectRepo;
        private readonly IRepository<ProjectAssignment> _assignmentRepo;
        private readonly IRepository<TeamMember> _teamMemberRepo;
        private readonly ITeamProfileStorageService _photoStorage;
        private readonly ITeamIntroVideoStorageService _introVideoStorage;

        public SalesTeamBrowseService(
            IRepository<Project> projectRepo,
            IRepository<ProjectAssignment> assignmentRepo,
            IRepository<TeamMember> teamMemberRepo,
            ITeamProfileStorageService photoStorage,
            ITeamIntroVideoStorageService introVideoStorage)
        {
            _projectRepo = projectRepo;
            _assignmentRepo = assignmentRepo;
            _teamMemberRepo = teamMemberRepo;
            _photoStorage = photoStorage;
            _introVideoStorage = introVideoStorage;
        }

        public async Task<PagedResponse<ClientTeamMemberCardDto>> BrowseTeamMembersAsync(
            int salesUserId,
            ClientTeamMemberBrowseRequest request)
        {
            HashSet<int>? projectFilterIds = null;
            Dictionary<int, string>? projectNameById = null;

            if (request.ProjectId.HasValue)
            {
                var project = await _projectRepo
                    .Query()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p =>
                        p.Id == request.ProjectId.Value
                        && !p.IsDeleted
                        && p.SalesId == salesUserId);

                if (project is null)
                {
                    return new PagedResponse<ClientTeamMemberCardDto>(
                        Array.Empty<ClientTeamMemberCardDto>(),
                        0,
                        GetPageIndex(request),
                        GetPageSize(request));
                }

                projectFilterIds = new HashSet<int> { project.Id };
                projectNameById = new Dictionary<int, string> { { project.Id, project.Name } };
            }

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

            List<(int TeamMemberId, int ProjectId)> memberProjectMap;
            if (projectFilterIds is not null)
            {
                memberProjectMap = await _assignmentRepo
                    .Query()
                    .AsNoTracking()
                    .Where(a => projectFilterIds.Contains(a.ProjectId) && a.IsActive && !a.IsDeleted)
                    .Select(a => new ValueTuple<int, int>(a.TeamMemberId, a.ProjectId))
                    .ToListAsync();

                var memberIds = memberProjectMap.Select(x => x.TeamMemberId).Distinct().ToList();
                query = query.Where(t => memberIds.Contains(t.Id));
            }
            else
            {
                memberProjectMap = await _assignmentRepo
                    .Query()
                    .AsNoTracking()
                    .Where(a => a.IsActive && !a.IsDeleted && !a.Project.IsDeleted)
                    .Select(a => new ValueTuple<int, int>(a.TeamMemberId, a.ProjectId))
                    .ToListAsync();

                projectNameById = await _projectRepo
                    .Query()
                    .AsNoTracking()
                    .Where(p => !p.IsDeleted)
                    .Select(p => new { p.Id, p.Name })
                    .ToDictionaryAsync(p => p.Id, p => p.Name);
            }

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
                        .Select(id => projectNameById!.TryGetValue(id, out var name) ? name : string.Empty)
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

        public async Task<ClientTeamMemberDetailDto> GetTeamMemberDetailAsync(int salesUserId, int teamMemberId)
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

            var projectNames = await _assignmentRepo
                .Query()
                .AsNoTracking()
                .Where(a =>
                    a.TeamMemberId == teamMemberId
                    && a.IsActive
                    && !a.IsDeleted
                    && !a.Project.IsDeleted)
                .Select(a => a.Project.Name)
                .Distinct()
                .OrderBy(name => name)
                .ToListAsync();

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

        private static int GetPageIndex(ClientTeamMemberBrowseRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(ClientTeamMemberBrowseRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(ClientTeamMemberBrowseRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);
    }
}
