using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Application.Common;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.TeamCatalogDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class TeamCatalogService : ITeamCatalogService
    {
        private const string CoverRootConfigKey = "Storage:TeamCoverRoot";
        private const string CoverPublicBasePath = "/storage/team-covers";
        private const int TopSkillsLimit = 6;
        private const int MemberPreviewLimit = 4;

        private readonly IRepository<Team> _teamRepo;
        private readonly IRepository<TeamMember> _teamMemberRepo;
        private readonly ITeamProfileStorageService _photoStorage;
        private readonly string _coverRootPath;

        public TeamCatalogService(
            IRepository<Team> teamRepo,
            IRepository<TeamMember> teamMemberRepo,
            ITeamProfileStorageService photoStorage,
            IConfiguration configuration)
        {
            _teamRepo = teamRepo;
            _teamMemberRepo = teamMemberRepo;
            _photoStorage = photoStorage;
            _coverRootPath = configuration[CoverRootConfigKey]
                ?? throw new InvalidOperationException(
                    $"Missing configuration key '{CoverRootConfigKey}'. Ensure LocalStorageBootstrap runs at startup.");
        }

        public async Task<PagedResponse<TeamDto>> GetTeamsAsync(TeamRequest request)
        {
            IQueryable<Team> query = _teamRepo.Query();

            if (request.Id.HasValue)
                query = query.Where(t => t.Id == request.Id.Value);

            if (request.IsActive.HasValue)
                query = query.Where(t => t.IsActive == request.IsActive.Value);

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = request.searchKey.Trim().ToLower();
                query = query.Where(t =>
                    t.Name.ToLower().Contains(searchKey)
                    || t.Description.ToLower().Contains(searchKey));
            }

            var totalCount = await query.CountAsync();
            var teams = await ApplySorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            var stats = await LoadTeamStatsAsync(teams.Select(t => t.Id).ToList());

            return new PagedResponse<TeamDto>(
                teams.Select(t => MapTeam(t, stats.GetValueOrDefault(t.Id))).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<TeamDto> GetTeamByIdAsync(int id)
        {
            var team = await _teamRepo.GetByIDAsync(id);
            if (team is null)
                throw new AppException("Team not found.", 404);

            var stats = await LoadTeamStatsAsync(new List<int> { id });
            return MapTeam(team, stats.GetValueOrDefault(id));
        }

        public async Task<TeamDto> CreateTeamAsync(CreateTeamDto dto)
        {
            ValidateName(dto.Name);
            await EnsureNameIsUniqueAsync(dto.Name);

            var team = new Team
            {
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                DisplayOrder = dto.DisplayOrder,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            await _teamRepo.AddAsync(team);
            await _teamRepo.SaveChangesAsync();

            if (dto.TeamMemberIds?.Any() == true)
            {
                await ApplyTeamMembersAsync(team.Id, dto.TeamMemberIds);
                await _teamMemberRepo.SaveChangesAsync();
            }

            return await GetTeamByIdAsync(team.Id);
        }

        public async Task<TeamDto> UpdateTeamAsync(int id, UpdateTeamDto dto)
        {
            ValidateName(dto.Name);
            await EnsureNameIsUniqueAsync(dto.Name, id);

            var team = await _teamRepo.GetByIDAsync(id);
            if (team is null)
                throw new AppException("Team not found.", 404);

            team.Name = dto.Name.Trim();
            team.Description = dto.Description?.Trim() ?? string.Empty;
            team.DisplayOrder = dto.DisplayOrder;
            team.IsActive = dto.IsActive;
            team.UpdatedAt = DateTime.UtcNow;

            _teamRepo.SaveInclude(
                team,
                nameof(team.Name),
                nameof(team.Description),
                nameof(team.DisplayOrder),
                nameof(team.IsActive),
                nameof(team.UpdatedAt));

            if (dto.TeamMemberIds != null)
            {
                await ApplyTeamMembersAsync(id, dto.TeamMemberIds);
                await _teamMemberRepo.SaveChangesAsync();
            }

            await _teamRepo.SaveChangesAsync();
            return await GetTeamByIdAsync(id);
        }

        public async Task DeleteTeamAsync(int id)
        {
            var team = await _teamRepo.GetByIDAsync(id);
            if (team is null)
                throw new AppException("Team not found.", 404);

            // Members go back to "Other specialists" instead of pointing at a deleted team.
            var members = await _teamMemberRepo
                .Query()
                .IgnoreQueryFilters()
                .Where(m => m.TeamId == id)
                .ToListAsync();

            foreach (var member in members)
            {
                member.TeamId = null;
                member.UpdatedAt = DateTime.UtcNow;
            }

            _teamRepo.SoftDelete(team);
            await _teamRepo.SaveChangesAsync();
        }

        public async Task<TeamDto> UploadCoverAsync(int id, Stream content, string fileName)
        {
            var team = await _teamRepo.GetByIDAsync(id);
            if (team is null)
                throw new AppException("Team not found.", 404);

            if ((content.CanSeek && content.Length == 0) || string.IsNullOrWhiteSpace(fileName))
                throw new AppException("Invalid request.", 400);

            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp"))
                throw new AppException("Cover image must be JPG, PNG, or WEBP.");

            Directory.CreateDirectory(_coverRootPath);
            var storedName = $"{id}-{Guid.NewGuid():N}{extension}";
            await using (var output = File.Create(Path.Combine(_coverRootPath, storedName)))
            {
                await content.CopyToAsync(output);
            }

            var previous = team.CoverImage;
            team.CoverImage = storedName;
            team.UpdatedAt = DateTime.UtcNow;
            _teamRepo.SaveInclude(team, nameof(team.CoverImage), nameof(team.UpdatedAt));
            await _teamRepo.SaveChangesAsync();

            DeleteCoverFile(previous);
            return await GetTeamByIdAsync(id);
        }

        public async Task<TeamDto> RemoveCoverAsync(int id)
        {
            var team = await _teamRepo.GetByIDAsync(id);
            if (team is null)
                throw new AppException("Team not found.", 404);

            var previous = team.CoverImage;
            team.CoverImage = string.Empty;
            team.UpdatedAt = DateTime.UtcNow;
            _teamRepo.SaveInclude(team, nameof(team.CoverImage), nameof(team.UpdatedAt));
            await _teamRepo.SaveChangesAsync();

            DeleteCoverFile(previous);
            return await GetTeamByIdAsync(id);
        }

        public async Task<List<TeamMemberOptionDto>> GetTeamMemberOptionsAsync()
        {
            var members = await _teamMemberRepo
                .Query()
                .AsNoTracking()
                .Include(m => m.User)
                .Include(m => m.Team)
                .Include(m => m.TeamMemberSkills)
                    .ThenInclude(s => s.Skill)
                .Where(m => m.User.IsActive && !m.User.IsDeleted)
                .OrderBy(m => m.User.FirstName)
                .ThenBy(m => m.User.LastName)
                .ToListAsync();

            return members.Select(m => new TeamMemberOptionDto
            {
                Id = m.Id,
                FullName = UserDisplayName.FromTeamMember(m),
                Title = m.Title,
                ProfilePhotoUrl = PhotoUrl(m.ProfilePhoto),
                TeamId = m.Team is null ? null : m.TeamId,
                TeamName = m.Team?.Name,
                Skills = m.TeamMemberSkills
                    .Where(s => s.Skill != null && s.Skill.IsActive && !string.IsNullOrWhiteSpace(s.Skill.Name))
                    .Select(s => s.Skill.Name)
                    .Distinct()
                    .ToList()
            }).ToList();
        }

        public async Task<TeamDto> SetTeamMembersAsync(int id, SetTeamMembersDto dto)
        {
            if (!await _teamRepo.IsExistAsync(id))
                throw new AppException("Team not found.", 404);

            await ApplyTeamMembersAsync(id, dto.TeamMemberIds ?? new List<int>());
            await _teamMemberRepo.SaveChangesAsync();
            return await GetTeamByIdAsync(id);
        }

        private async Task ApplyTeamMembersAsync(int id, IEnumerable<int> memberIds)
        {
            var wanted = memberIds.Distinct().ToList();

            // A member belongs to one team: adding someone here moves them out of their previous team.
            var affected = await _teamMemberRepo
                .Query()
                .Where(m => m.TeamId == id || wanted.Contains(m.Id))
                .ToListAsync();

            if (affected.Count(m => wanted.Contains(m.Id)) != wanted.Count)
                throw new AppException("One or more team members were not found.", 400);

            var now = DateTime.UtcNow;
            foreach (var member in affected)
            {
                var newTeamId = wanted.Contains(member.Id) ? id : (int?)null;
                if (member.TeamId == newTeamId)
                    continue;

                member.TeamId = newTeamId;
                member.UpdatedAt = now;
            }
        }

        public async Task<TeamCatalogDto> GetCatalogAsync(TeamCatalogRequest request)
        {
            var visibleMembers = _teamMemberRepo
                .Query()
                .AsNoTracking()
                .Where(m => m.User.IsActive && !m.User.IsDeleted);

            var totalSpecialists = await visibleMembers.CountAsync();
            var unassignedCount = await visibleMembers
                .CountAsync(m => m.TeamId == null || m.Team == null || !m.Team.IsActive);

            var teams = await _teamRepo
                .Query()
                .AsNoTracking()
                .Where(t => t.IsActive)
                .OrderBy(t => t.DisplayOrder)
                .ThenBy(t => t.Name)
                .ToListAsync();

            var teamIds = teams.Select(t => t.Id).ToList();
            var stats = await LoadTeamStatsAsync(teamIds);

            var previews = (await visibleMembers
                    .Where(m => m.TeamId != null && teamIds.Contains(m.TeamId.Value))
                    .OrderBy(m => m.User.FirstName)
                    .Select(m => new
                    {
                        TeamId = m.TeamId!.Value,
                        m.User.FirstName,
                        m.User.LastName,
                        m.ProfilePhoto
                    })
                    .ToListAsync())
                .GroupBy(m => m.TeamId)
                .ToDictionary(
                    g => g.Key,
                    g => g
                        // Members with a photo make a nicer face stack.
                        .OrderBy(m => string.IsNullOrWhiteSpace(m.ProfilePhoto))
                        .Take(MemberPreviewLimit)
                        .Select(m => new TeamCatalogMemberPreviewDto
                        {
                            FullName = UserDisplayName.Build(m.FirstName, m.LastName),
                            ProfilePhotoUrl = PhotoUrl(m.ProfilePhoto)
                        })
                        .ToList());

            var term = request.SearchKey?.Trim();
            var cards = new List<TeamCatalogCardDto>();
            foreach (var team in teams)
            {
                var teamStats = stats.GetValueOrDefault(team.Id) ?? TeamStats.Empty;
                if (teamStats.MemberCount == 0)
                    continue;

                string? matchedSkill = null;
                if (!string.IsNullOrEmpty(term))
                {
                    var nameMatches =
                        team.Name.Contains(term, StringComparison.OrdinalIgnoreCase)
                        || (team.Description ?? string.Empty).Contains(term, StringComparison.OrdinalIgnoreCase);
                    if (!nameMatches)
                    {
                        matchedSkill = teamStats.AllSkills
                            .FirstOrDefault(s => s.Contains(term, StringComparison.OrdinalIgnoreCase));
                        if (matchedSkill is null)
                            continue;
                    }
                }

                cards.Add(new TeamCatalogCardDto
                {
                    Id = team.Id,
                    Name = team.Name,
                    Description = team.Description ?? string.Empty,
                    CoverImageUrl = CoverUrl(team.CoverImage),
                    MemberCount = teamStats.MemberCount,
                    TopSkills = teamStats.AllSkills.Take(TopSkillsLimit).ToList(),
                    SkillCount = teamStats.AllSkills.Count,
                    MatchedSkill = matchedSkill,
                    MemberPreviews = previews.GetValueOrDefault(team.Id) ?? new List<TeamCatalogMemberPreviewDto>()
                });
            }

            return new TeamCatalogDto
            {
                Teams = cards,
                UnassignedCount = unassignedCount,
                TotalSpecialists = totalSpecialists
            };
        }

        /// <summary>
        /// Member count and skills (ordered by how many members have them) per team,
        /// counting only members whose user account is active.
        /// </summary>
        private async Task<Dictionary<int, TeamStats>> LoadTeamStatsAsync(List<int> teamIds)
        {
            if (teamIds.Count == 0)
                return new Dictionary<int, TeamStats>();

            var members = await _teamMemberRepo
                .Query()
                .AsNoTracking()
                .Where(m => m.TeamId != null
                    && teamIds.Contains(m.TeamId.Value)
                    && m.User.IsActive
                    && !m.User.IsDeleted)
                .Select(m => new
                {
                    TeamId = m.TeamId!.Value,
                    Skills = m.TeamMemberSkills
                        .Where(s => s.Skill != null && s.Skill.IsActive)
                        .Select(s => s.Skill.Name)
                        .ToList()
                })
                .ToListAsync();

            return members
                .GroupBy(m => m.TeamId)
                .ToDictionary(
                    g => g.Key,
                    g => new TeamStats(
                        g.Count(),
                        g.SelectMany(m => m.Skills.Distinct())
                            .Where(name => !string.IsNullOrWhiteSpace(name))
                            .GroupBy(name => name)
                            .OrderByDescending(s => s.Count())
                            .ThenBy(s => s.Key)
                            .Select(s => s.Key)
                            .ToList()));
        }

        private TeamDto MapTeam(Team team, TeamStats? stats)
        {
            stats ??= TeamStats.Empty;
            return new TeamDto
            {
                Id = team.Id,
                Name = team.Name,
                Description = team.Description ?? string.Empty,
                CoverImageUrl = CoverUrl(team.CoverImage),
                DisplayOrder = team.DisplayOrder,
                IsActive = team.IsActive,
                MemberCount = stats.MemberCount,
                TopSkills = stats.AllSkills.Take(TopSkillsLimit).ToList()
            };
        }

        private string? PhotoUrl(string? storedFileName)
            => string.IsNullOrWhiteSpace(storedFileName) ? null : _photoStorage.GetPhotoPublicUrl(storedFileName);

        private static string? CoverUrl(string? storedFileName)
            => string.IsNullOrWhiteSpace(storedFileName) ? null : $"{CoverPublicBasePath}/{storedFileName.Trim()}";

        private void DeleteCoverFile(string? storedFileName)
        {
            if (string.IsNullOrWhiteSpace(storedFileName))
                return;

            var path = Path.Combine(_coverRootPath, Path.GetFileName(storedFileName));
            try
            {
                if (File.Exists(path))
                    File.Delete(path);
            }
            catch (IOException)
            {
                // A leftover file is harmless; the team no longer references it.
            }
        }

        private static void ValidateName(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new AppException("Team name is required.", 400);
        }

        private async Task EnsureNameIsUniqueAsync(string name, int? excludeId = null)
        {
            var normalized = name.Trim().ToLower();
            var exists = await _teamRepo
                .Query()
                .AnyAsync(t => t.Name.ToLower() == normalized && (!excludeId.HasValue || t.Id != excludeId.Value));

            if (exists)
                throw new AppException("A team with this name already exists.", 400);
        }

        private static IQueryable<Team> ApplySorting(IQueryable<Team> query, TeamRequest request)
        {
            var isDescending = string.Equals(request.SortDirection, "DESC", StringComparison.OrdinalIgnoreCase);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "name" => isDescending ? query.OrderByDescending(t => t.Name) : query.OrderBy(t => t.Name),
                "isactive" => isDescending ? query.OrderByDescending(t => t.IsActive) : query.OrderBy(t => t.IsActive),
                "displayorder" => isDescending
                    ? query.OrderByDescending(t => t.DisplayOrder).ThenBy(t => t.Name)
                    : query.OrderBy(t => t.DisplayOrder).ThenBy(t => t.Name),
                // Default (including the base request's "Id"): the order clients see in the catalog.
                _ => query.OrderBy(t => t.DisplayOrder).ThenBy(t => t.Name)
            };
        }

        private static int GetPageIndex(TeamRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(TeamRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(TeamRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private sealed record TeamStats(int MemberCount, List<string> AllSkills)
        {
            public static readonly TeamStats Empty = new(0, new List<string>());
        }
    }
}
