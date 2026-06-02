using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.TeamManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Domain.Entities;
using System.Text;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class TeamManagementService : ITeamManagementService
    {
        private readonly IRepository<TeamMember> _teamMemberRepo;
        private readonly IRepository<User> _userRepo;
        private readonly IRepository<Role> _roleRepo;
        private readonly IRepository<Skill> _skillRepo;
        private readonly IRepository<TeamMemberSkill> _teamMemberSkillRepo;
        private readonly ITeamCvStorageService _cvStorageService;

        public TeamManagementService(
            IRepository<TeamMember> teamMemberRepo,
            IRepository<User> userRepo,
            IRepository<Role> roleRepo,
            IRepository<Skill> skillRepo,
            IRepository<TeamMemberSkill> teamMemberSkillRepo,
            ITeamCvStorageService cvStorageService)
        {
            _teamMemberRepo = teamMemberRepo;
            _userRepo = userRepo;
            _roleRepo = roleRepo;
            _skillRepo = skillRepo;
            _teamMemberSkillRepo = teamMemberSkillRepo;
            _cvStorageService = cvStorageService;
        }

        public async Task<PagedResponse<TeamMemberDto>> GetAllAsync(TeamMemberRequest request)
        {
            var query = BuildBaseQuery();

            if (request.Id.HasValue)
                query = query.Where(t => t.Id == request.Id.Value);

            if (request.UserId.HasValue)
                query = query.Where(t => t.UserId == request.UserId.Value);

            if (request.LeaderId.HasValue)
                query = query.Where(t => t.LeaderId == request.LeaderId.Value);

            if (request.IsAvailable.HasValue)
                query = query.Where(t => t.IsAvailable == request.IsAvailable.Value);

            if (request.SkillId.HasValue)
                query = query.Where(t => t.TeamMemberSkills.Any(ts => ts.SkillId == request.SkillId.Value));

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(t =>
                    t.User.FirstName.ToLower().Contains(searchKey)
                    || t.User.LastName.ToLower().Contains(searchKey)
                    || t.Title.ToLower().Contains(searchKey)
                    || t.PhoneNumber.ToLower().Contains(searchKey)
                    || t.User.Email.ToLower().Contains(searchKey)
                    || t.TeamMemberSkills.Any(ts => ts.Skill.Name.ToLower().Contains(searchKey)));
            }

            var totalCount = await query.CountAsync();
            var members = await ApplyTeamMemberSorting(query, request)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<TeamMemberDto>(
                members.Select(MapToDto).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<TeamMemberDto> GetByIdAsync(int id)
        {
            var member = await BuildBaseQuery()
                .FirstOrDefaultAsync(t => t.Id == id);

            if (member is null)
                throw new AppException("Resource not found.", 404);

            return MapToDto(member);
        }

        public async Task<TeamMemberDto> CreateAsync(CreateTeamMemberDto dto)
        {
            ValidateTeamMemberInput(dto.Title, dto.YearsOfExperience);
            ValidateUserInput(dto.FirstName, dto.LastName, dto.Email, dto.Password);
            await ValidateLeaderAsync(dto.LeaderId);
            await ValidateSkillAssignmentsAsync(dto.SkillAssignments);

            var normalizedEmail = NormalizeEmail(dto.Email);
            var emailExists = await _userRepo
                .GetAll(u => u.Email == normalizedEmail)
                .AnyAsync();

            if (emailExists)
                throw new AppException("Email already exists.", 400);

            var teamMemberRole = await _roleRepo
                .GetAll(r => r.Name == "TeamMember")
                .FirstOrDefaultAsync();

            if (teamMemberRole is null)
                throw new AppException("Resource not found.", 404);

            var user = new User
            {
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = normalizedEmail,
                PasswordHash = HashPassword(dto.Password),
                RoleId = teamMemberRole.Id,
                IsEmailVerified = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var member = new TeamMember
            {
                User = user,
                Title = dto.Title.Trim(),
                YearsOfExperience = dto.YearsOfExperience,
                CV = string.Empty,
                PhoneNumber = dto.PhoneNumber?.Trim() ?? string.Empty,
                LeaderId = dto.LeaderId,
                IsAvailable = dto.IsAvailable,
                CreatedAt = DateTime.UtcNow
            };

            await _teamMemberRepo.AddAsync(member);
            await _teamMemberRepo.SaveChangesAsync();

            await AddSkillAssignmentsAsync(member.Id, dto.SkillAssignments);

            return await GetByIdAsync(member.Id);
        }

        public async Task<TeamMemberDto> UpdateAsync(int id, UpdateTeamMemberDto dto)
        {
            ValidateTeamMemberInput(dto.Title, dto.YearsOfExperience);
            ValidateUserInput(dto.FirstName, dto.LastName, dto.Email);
            await ValidateLeaderAsync(dto.LeaderId, id);
            await ValidateSkillAssignmentsAsync(dto.SkillAssignments);

            var member = await _teamMemberRepo
                .Query()
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (member is null)
                throw new AppException("Resource not found.", 404);

            var normalizedEmail = NormalizeEmail(dto.Email);
            var emailExists = await _userRepo
                .GetAll(u => u.Email == normalizedEmail && u.Id != member.UserId)
                .AnyAsync();

            if (emailExists)
                throw new AppException("Email already exists.", 400);

            member.User.FirstName = dto.FirstName.Trim();
            member.User.LastName = dto.LastName.Trim();
            member.User.Email = normalizedEmail;
            member.User.UpdatedAt = DateTime.UtcNow;

            member.Title = dto.Title.Trim();
            member.YearsOfExperience = dto.YearsOfExperience;
            member.PhoneNumber = dto.PhoneNumber?.Trim() ?? string.Empty;
            member.LeaderId = dto.LeaderId;
            member.IsAvailable = dto.IsAvailable;
            member.UpdatedAt = DateTime.UtcNow;

            _teamMemberRepo.SaveInclude(
                member,
                nameof(member.Title),
                nameof(member.YearsOfExperience),
                nameof(member.PhoneNumber),
                nameof(member.LeaderId),
                nameof(member.IsAvailable),
                nameof(member.UpdatedAt));

            _userRepo.SaveInclude(
                member.User,
                nameof(member.User.FirstName),
                nameof(member.User.LastName),
                nameof(member.User.Email),
                nameof(member.User.UpdatedAt));

            await _teamMemberRepo.SaveChangesAsync();
            await ReplaceSkillAssignmentsAsync(id, dto.SkillAssignments);

            return await GetByIdAsync(id);
        }

        public async Task DeleteAsync(int id)
        {
            var member = await _teamMemberRepo.GetByIDAsync(id);
            if (member is null)
                throw new AppException("Resource not found.", 404);

            var activeSubordinates = await _teamMemberRepo
                .GetAll(t => t.LeaderId == id)
                .AnyAsync();

            if (activeSubordinates)
                throw new AppException("Invalid request.", 400);

            var skillAssignments = await _teamMemberSkillRepo
                .GetAll(s => s.TeamMemberId == id)
                .ToListAsync();

            foreach (var skillAssignment in skillAssignments)
                _teamMemberSkillRepo.HardDelete(skillAssignment);

            var user = await _userRepo.GetByIDAsync(member.UserId);
            if (user is not null)
            {
                user.IsActive = false;
                user.IsDeleted = true;
                user.DeletedAt = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;

                _userRepo.SaveInclude(
                    user,
                    nameof(user.IsActive),
                    nameof(user.IsDeleted),
                    nameof(user.DeletedAt),
                    nameof(user.UpdatedAt));
            }

            _teamMemberRepo.SoftDelete(member);
            await _teamMemberRepo.SaveChangesAsync();
        }

        public async Task<TeamMemberDto> AssignSkillAsync(int teamMemberId, UpsertTeamMemberSkillDto dto)
        {
            await EnsureTeamMemberExistsAsync(teamMemberId);
            await ValidateSkillAssignmentsAsync(new[] { dto });

            var existing = await _teamMemberSkillRepo
                .GetAll(s => s.TeamMemberId == teamMemberId && s.SkillId == dto.SkillId)
                .FirstOrDefaultAsync();

            if (existing is null)
            {
                await _teamMemberSkillRepo.AddAsync(CreateSkillAssignment(teamMemberId, dto));
            }
            else
            {
                existing.ProficiencyLevel = dto.ProficiencyLevel;
                existing.YearsOfExperience = dto.YearsOfExperience;
                existing.AcquiredDate = dto.AcquiredDate ?? existing.AcquiredDate;
                existing.IsEndorsed = dto.IsEndorsed;
                existing.EndorsementCount = dto.EndorsementCount ?? 0;
                existing.UpdatedAt = DateTime.UtcNow;

                _teamMemberSkillRepo.SaveInclude(
                    existing,
                    nameof(existing.ProficiencyLevel),
                    nameof(existing.YearsOfExperience),
                    nameof(existing.AcquiredDate),
                    nameof(existing.IsEndorsed),
                    nameof(existing.EndorsementCount),
                    nameof(existing.UpdatedAt));
            }

            await _teamMemberSkillRepo.SaveChangesAsync();
            return await GetByIdAsync(teamMemberId);
        }

        public async Task<TeamMemberDto> RemoveSkillAsync(int teamMemberId, int skillId)
        {
            await EnsureTeamMemberExistsAsync(teamMemberId);

            var assignment = await _teamMemberSkillRepo
                .GetAll(s => s.TeamMemberId == teamMemberId && s.SkillId == skillId)
                .FirstOrDefaultAsync();

            if (assignment is null)
                throw new AppException("Resource not found.", 404);

            _teamMemberSkillRepo.HardDelete(assignment);
            await _teamMemberSkillRepo.SaveChangesAsync();

            return await GetByIdAsync(teamMemberId);
        }

        public async Task<CvStorageResultDto> GenerateCvAsync(int teamMemberId)
        {
            var member = await BuildBaseQuery()
                .FirstOrDefaultAsync(t => t.Id == teamMemberId);

            if (member is null)
                throw new AppException("Resource not found.", 404);

            var content = BuildCvContent(member);
            var path = await _cvStorageService.SaveGeneratedCvAsync(
                member.Id,
                UserDisplayName.FromTeamMember(member),
                content);

            await UpdateCvPathAsync(member.Id, path);

            return new CvStorageResultDto
            {
                TeamMemberId = member.Id,
                CvPath = path
            };
        }

        public async Task<CvStorageResultDto> StoreCvAsync(int teamMemberId, Stream content, string fileName)
        {
            await EnsureTeamMemberExistsAsync(teamMemberId);

            if ((content.CanSeek && content.Length == 0) || string.IsNullOrWhiteSpace(fileName))
                throw new AppException("Invalid request.", 400);

            var path = await _cvStorageService.SaveUploadedCvAsync(teamMemberId, fileName, content);
            await UpdateCvPathAsync(teamMemberId, path);

            return new CvStorageResultDto
            {
                TeamMemberId = teamMemberId,
                CvPath = path
            };
        }

        public async Task<IReadOnlyList<TeamStructureDto>> GetTeamStructureAsync()
        {
            var members = await _teamMemberRepo
                .GetAll()
                .Include(t => t.User)
                .OrderBy(t => t.User.FirstName)
                .ThenBy(t => t.User.LastName)
                .ToListAsync();

            var childrenByLeader = members
                .Where(t => t.LeaderId.HasValue)
                .GroupBy(t => t.LeaderId!.Value)
                .ToDictionary(g => g.Key, g => g.ToList());

            var roots = members
                .Where(t => t.LeaderId is null || members.All(m => m.Id != t.LeaderId.Value))
                .OrderBy(t => t.User.FirstName)
                .ThenBy(t => t.User.LastName)
                .ToList();

            return roots.Select(root => MapStructure(root, childrenByLeader, new HashSet<int>())).ToList();
        }

        public async Task<TeamMemberDto> GetTeamMemberProfileAsync(int userId)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            return MapToDto(member);
        }

        public async Task<TeamMemberDto> UpdateTeamMemberProfileAsync(int userId, UpdateTeamMemberProfileDto dto)
        {
            ValidateTeamMemberInput(dto.Title, dto.YearsOfExperience);

            var member = await GetTeamMemberEntityForUserAsync(userId);
            member.Title = dto.Title.Trim();
            member.YearsOfExperience = dto.YearsOfExperience;
            member.PhoneNumber = dto.PhoneNumber?.Trim() ?? string.Empty;
            member.UpdatedAt = DateTime.UtcNow;

            _teamMemberRepo.SaveInclude(
                member,
                nameof(member.Title),
                nameof(member.YearsOfExperience),
                nameof(member.PhoneNumber),
                nameof(member.UpdatedAt));
            await _teamMemberRepo.SaveChangesAsync();

            return await GetTeamMemberProfileAsync(userId);
        }

        public async Task<TeamMemberDto> UpdateAvailabilityAsync(int userId, bool isAvailable)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            member.IsAvailable = isAvailable;
            member.UpdatedAt = DateTime.UtcNow;

            _teamMemberRepo.SaveInclude(
                member,
                nameof(member.IsAvailable),
                nameof(member.UpdatedAt));
            await _teamMemberRepo.SaveChangesAsync();

            return await GetTeamMemberProfileAsync(userId);
        }

        public Task<TeamMemberDto> AssignSkillForUserAsync(int userId, UpsertTeamMemberSkillDto dto)
        {
            return AssignSkillForMemberAsync(userId, dto);
        }

        public Task<TeamMemberDto> RemoveSkillForUserAsync(int userId, int skillId)
        {
            return RemoveSkillForMemberAsync(userId, skillId);
        }

        public Task<CvStorageResultDto> GenerateCvForUserAsync(int userId)
        {
            return GenerateCvForMemberAsync(userId);
        }

        public Task<CvStorageResultDto> StoreCvForUserAsync(int userId, Stream content, string fileName)
        {
            return StoreCvForMemberAsync(userId, content, fileName);
        }

        private async Task<TeamMemberDto> AssignSkillForMemberAsync(int userId, UpsertTeamMemberSkillDto dto)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            return await AssignSkillAsync(member.Id, dto);
        }

        private async Task<TeamMemberDto> RemoveSkillForMemberAsync(int userId, int skillId)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            return await RemoveSkillAsync(member.Id, skillId);
        }

        private async Task<CvStorageResultDto> GenerateCvForMemberAsync(int userId)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            return await GenerateCvAsync(member.Id);
        }

        private async Task<CvStorageResultDto> StoreCvForMemberAsync(int userId, Stream content, string fileName)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            return await StoreCvAsync(member.Id, content, fileName);
        }

        private async Task<TeamMember> GetTeamMemberEntityForUserAsync(int userId)
        {
            var member = await BuildBaseQuery()
                .FirstOrDefaultAsync(t => t.UserId == userId);

            if (member is null)
                throw new AppException("Team member profile not found for current user.", 404);

            return member;
        }

        private IQueryable<TeamMember> BuildBaseQuery()
        {
            return _teamMemberRepo.Query()
                .Include(t => t.User)
                .Include(t => t.Leader)
                    .ThenInclude(l => l.User)
                .Include(t => t.TeamMemberSkills)
                    .ThenInclude(ts => ts.Skill)
                        .ThenInclude(s => s.SkillCategory);
        }

        private async Task AddSkillAssignmentsAsync(int teamMemberId, IEnumerable<UpsertTeamMemberSkillDto> assignments)
        {
            var entities = assignments
                .GroupBy(a => a.SkillId)
                .Select(g => CreateSkillAssignment(teamMemberId, g.Last()))
                .ToList();

            if (entities.Count == 0)
                return;

            await _teamMemberSkillRepo.AddRangeAsync(entities);
            await _teamMemberSkillRepo.SaveChangesAsync();
        }

        private async Task ReplaceSkillAssignmentsAsync(int teamMemberId, IEnumerable<UpsertTeamMemberSkillDto> assignments)
        {
            var existing = await _teamMemberSkillRepo
                .GetAll(s => s.TeamMemberId == teamMemberId)
                .ToListAsync();

            foreach (var skillAssignment in existing)
                _teamMemberSkillRepo.HardDelete(skillAssignment);

            await _teamMemberSkillRepo.SaveChangesAsync();

            await AddSkillAssignmentsAsync(teamMemberId, assignments);
        }

        private async Task UpdateCvPathAsync(int teamMemberId, string path)
        {
            var member = await _teamMemberRepo.GetByIDAsync(teamMemberId);
            if (member is null)
                throw new AppException("Resource not found.", 404);

            member.CV = path;
            member.UpdatedAt = DateTime.UtcNow;

            _teamMemberRepo.SaveInclude(member, nameof(member.CV), nameof(member.UpdatedAt));
            await _teamMemberRepo.SaveChangesAsync();
        }

        private static TeamMemberSkill CreateSkillAssignment(int teamMemberId, UpsertTeamMemberSkillDto dto)
        {
            return new TeamMemberSkill
            {
                TeamMemberId = teamMemberId,
                SkillId = dto.SkillId,
                ProficiencyLevel = dto.ProficiencyLevel,
                YearsOfExperience = dto.YearsOfExperience,
                AcquiredDate = dto.AcquiredDate ?? DateTime.UtcNow,
                IsEndorsed = dto.IsEndorsed,
                EndorsementCount = dto.EndorsementCount ?? 0,
                CreatedAt = DateTime.UtcNow
            };
        }

        private async Task EnsureTeamMemberExistsAsync(int teamMemberId)
        {
            if (teamMemberId <= 0 || !await _teamMemberRepo.IsExistAsync(teamMemberId))
                throw new AppException("Resource not found.", 404);
        }

        private async Task ValidateLeaderAsync(int? leaderId, int? teamMemberId = null)
        {
            if (leaderId is null)
                return;

            if (leaderId <= 0 || !await _teamMemberRepo.IsExistAsync(leaderId.Value))
                throw new AppException("Resource not found.", 404);

            if (teamMemberId.HasValue && leaderId.Value == teamMemberId.Value)
                throw new AppException("Invalid request.", 400);
        }

        private async Task ValidateSkillAssignmentsAsync(IEnumerable<UpsertTeamMemberSkillDto> assignments)
        {
            foreach (var assignment in assignments)
            {
                if (assignment.SkillId <= 0 || !await _skillRepo.IsExistAsync(assignment.SkillId))
                    throw new AppException("Resource not found.", 404);

                if (assignment.ProficiencyLevel is < 1 or > 5 || assignment.YearsOfExperience < 0)
                    throw new AppException("Invalid request.", 400);
            }
        }

        private static void ValidateTeamMemberInput(string title, int yearsOfExperience)
        {
            if (string.IsNullOrWhiteSpace(title)
                || yearsOfExperience < 0)
            {
                throw new AppException("Invalid request.", 400);
            }
        }

        private static void ValidateUserInput(
            string firstName,
            string lastName,
            string email,
            string? password = null)
        {
            if (string.IsNullOrWhiteSpace(firstName)
                || string.IsNullOrWhiteSpace(lastName)
                || string.IsNullOrWhiteSpace(email)
                || !email.Contains('@'))
            {
                throw new AppException("Invalid request.", 400);
            }

            if (password is not null && password.Length < 8)
                throw new AppException("Invalid request.", 400);
        }

        private static string NormalizeEmail(string email)
            => email.Trim().ToLowerInvariant();

        private static string Normalize(string value)
            => value.Trim().ToLowerInvariant();

        private static IQueryable<TeamMember> ApplyTeamMemberSorting(
            IQueryable<TeamMember> query,
            TeamMemberRequest request)
        {
            var isDescending = IsDescending(request.SortDirection);

            return request.SortColumn.Trim().ToLowerInvariant() switch
            {
                "fullname" => isDescending
                    ? query.OrderByDescending(t => t.User.LastName).ThenByDescending(t => t.User.FirstName)
                    : query.OrderBy(t => t.User.LastName).ThenBy(t => t.User.FirstName),
                "firstname" => isDescending ? query.OrderByDescending(t => t.User.FirstName) : query.OrderBy(t => t.User.FirstName),
                "lastname" => isDescending ? query.OrderByDescending(t => t.User.LastName) : query.OrderBy(t => t.User.LastName),
                "email" => isDescending ? query.OrderByDescending(t => t.User.Email) : query.OrderBy(t => t.User.Email),
                "title" => isDescending ? query.OrderByDescending(t => t.Title) : query.OrderBy(t => t.Title),
                "yearsofexperience" => isDescending ? query.OrderByDescending(t => t.YearsOfExperience) : query.OrderBy(t => t.YearsOfExperience),
                "leaderid" => isDescending ? query.OrderByDescending(t => t.LeaderId) : query.OrderBy(t => t.LeaderId),
                "isavailable" => isDescending ? query.OrderByDescending(t => t.IsAvailable) : query.OrderBy(t => t.IsAvailable),
                _ => isDescending ? query.OrderByDescending(t => t.Id) : query.OrderBy(t => t.Id)
            };
        }

        private static bool IsDescending(string sortDirection)
            => !string.Equals(sortDirection, "ASC", StringComparison.OrdinalIgnoreCase);

        private static int GetPageIndex(TeamMemberRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(TeamMemberRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(TeamMemberRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private static string BuildFullName(string firstName, string lastName)
            => UserDisplayName.Build(firstName, lastName);

        private static string HashPassword(string password)
            => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

        private static TeamMemberDto MapToDto(TeamMember member)
        {
            return new TeamMemberDto
            {
                Id = member.Id,
                UserId = member.UserId,
                FirstName = member.User?.FirstName ?? string.Empty,
                LastName = member.User?.LastName ?? string.Empty,
                Email = member.User?.Email ?? string.Empty,
                FullName = UserDisplayName.FromTeamMember(member),
                Title = member.Title,
                YearsOfExperience = member.YearsOfExperience,
                CV = member.CV,
                PhoneNumber = member.PhoneNumber,
                LeaderId = member.LeaderId,
                LeaderName = UserDisplayName.FromTeamMember(member.Leader),
                IsAvailable = member.IsAvailable,
                SkillAssignments = member.TeamMemberSkills
                    .OrderBy(s => s.Skill.Name)
                    .Select(MapSkill)
                    .ToList()
            };
        }

        private static TeamMemberSkillDto MapSkill(TeamMemberSkill skill)
        {
            return new TeamMemberSkillDto
            {
                Id = skill.Id,
                SkillId = skill.SkillId,
                SkillName = skill.Skill?.Name ?? string.Empty,
                SkillCategoryName = skill.Skill?.SkillCategory?.Name ?? string.Empty,
                ProficiencyLevel = skill.ProficiencyLevel,
                YearsOfExperience = skill.YearsOfExperience,
                AcquiredDate = skill.AcquiredDate,
                IsEndorsed = skill.IsEndorsed,
                EndorsementCount = skill.EndorsementCount
            };
        }

        private static TeamStructureDto MapStructure(
            TeamMember member,
            IReadOnlyDictionary<int, List<TeamMember>> childrenByLeader,
            HashSet<int> visited)
        {
            if (!visited.Add(member.Id))
            {
                return new TeamStructureDto
                {
                    Id = member.Id,
                    FullName = UserDisplayName.FromTeamMember(member),
                    Title = member.Title,
                    YearsOfExperience = member.YearsOfExperience,
                    IsAvailable = member.IsAvailable
                };
            }

            childrenByLeader.TryGetValue(member.Id, out var children);

            return new TeamStructureDto
            {
                Id = member.Id,
                FullName = UserDisplayName.FromTeamMember(member),
                Title = member.Title,
                YearsOfExperience = member.YearsOfExperience,
                IsAvailable = member.IsAvailable,
                TeamMembers = (children ?? new List<TeamMember>())
                    .OrderBy(t => t.User?.FirstName)
                    .ThenBy(t => t.User?.LastName)
                    .Select(child => MapStructure(child, childrenByLeader, new HashSet<int>(visited)))
                    .ToList()
            };
        }

        private static string BuildCvContent(TeamMember member)
        {
            var builder = new StringBuilder();
            builder.AppendLine(UserDisplayName.FromTeamMember(member));
            builder.AppendLine(member.Title);
            builder.AppendLine();
            builder.AppendLine($"Years of Experience: {member.YearsOfExperience}");
            builder.AppendLine($"Phone: {member.PhoneNumber}");
            builder.AppendLine($"Leader: {(string.IsNullOrWhiteSpace(UserDisplayName.FromTeamMember(member.Leader)) ? "N/A" : UserDisplayName.FromTeamMember(member.Leader))}");
            builder.AppendLine($"Availability: {(member.IsAvailable ? "Available" : "Unavailable")}");
            builder.AppendLine();
            builder.AppendLine("Skills Summary");
            builder.AppendLine();
            builder.AppendLine("Tracked Skills");

            foreach (var skill in member.TeamMemberSkills.OrderBy(s => s.Skill.Name))
            {
                builder.AppendLine(
                    $"- {skill.Skill.Name} ({skill.Skill.SkillCategory.Name}) | Level {skill.ProficiencyLevel}/5 | {skill.YearsOfExperience} years");
            }

            return builder.ToString();
        }
    }
}
