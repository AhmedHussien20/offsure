using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using OffsureManagementSystem.Application.Common;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.Common.Requests;
using OffsureManagementSystem.Application.DTOs.TeamManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Domain.Entities;
using OffsureManagementSystem.Domain.Entities.Enum;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public partial class TeamManagementService : ITeamManagementService
    {
        private readonly IRepository<TeamMember> _teamMemberRepo;
        private readonly IRepository<User> _userRepo;
        private readonly IRepository<Role> _roleRepo;
        private readonly IRepository<Skill> _skillRepo;
        private readonly IRepository<TeamMemberSkill> _teamMemberSkillRepo;
        private readonly IRepository<TeamMemberCertificate> _certificateRepo;
        private readonly IRepository<TeamMemberExperience> _experienceRepo;
        private readonly IRepository<ProjectAssignment> _projectAssignmentRepo;
        private readonly ITeamCvStorageService _cvStorageService;
        private readonly ITeamProfileStorageService _profileStorageService;
        private readonly ITeamIntroVideoStorageService _introVideoStorageService;
        private readonly IConfiguration _configuration;

        public TeamManagementService(
            IRepository<TeamMember> teamMemberRepo,
            IRepository<User> userRepo,
            IRepository<Role> roleRepo,
            IRepository<Skill> skillRepo,
            IRepository<TeamMemberSkill> teamMemberSkillRepo,
            IRepository<TeamMemberCertificate> certificateRepo,
            IRepository<TeamMemberExperience> experienceRepo,
            IRepository<ProjectAssignment> projectAssignmentRepo,
            ITeamCvStorageService cvStorageService,
            ITeamProfileStorageService profileStorageService,
            ITeamIntroVideoStorageService introVideoStorageService,
            IConfiguration configuration)
        {
            _teamMemberRepo = teamMemberRepo;
            _userRepo = userRepo;
            _roleRepo = roleRepo;
            _skillRepo = skillRepo;
            _teamMemberSkillRepo = teamMemberSkillRepo;
            _certificateRepo = certificateRepo;
            _experienceRepo = experienceRepo;
            _projectAssignmentRepo = projectAssignmentRepo;
            _cvStorageService = cvStorageService;
            _profileStorageService = profileStorageService;
            _introVideoStorageService = introVideoStorageService;
            _configuration = configuration;
        }

        public async Task<PagedResponse<TeamMemberDto>> GetAllAsync(TeamMemberRequest request)
        {
            var query = BuildListQuery();

            if (request.Id.HasValue)
                query = query.Where(t => t.Id == request.Id.Value);

            if (request.UserId.HasValue)
                query = query.Where(t => t.UserId == request.UserId.Value);

            if (request.ResourceManagerId.HasValue)
                query = query.Where(t => t.ResourceManagerId == request.ResourceManagerId.Value);

            if (request.IsAvailable.HasValue)
                query = query.Where(t => t.IsAvailable == request.IsAvailable.Value);

            if (request.IsActive.HasValue)
                query = query.Where(t => t.User.IsActive == request.IsActive.Value);
            else
                query = query.Where(t => t.User.IsActive);

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
                members.Select(m => MapToListDto(m)).ToList(),
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

            var dto = MapToDto(member);
            dto.ProjectNames = await GetActiveProjectNamesAsync(id);
            return dto;
        }

        public async Task<TeamMemberDto> CreateAsync(CreateTeamMemberDto dto)
        {
            ValidateTeamMemberInput(dto.Title, dto.YearsOfExperience);
            ValidateUserInput(dto.FirstName, dto.LastName, dto.Email, dto.Password);
            await ValidateResourceManagerAsync(dto.ResourceManagerId);
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
                ResourceManagerId = dto.ResourceManagerId is > 0 ? dto.ResourceManagerId : null,
                IsAvailable = dto.IsAvailable,
                HourlySalary = dto.HourlySalary,
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
            await ValidateResourceManagerAsync(dto.ResourceManagerId, id);
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
            member.ResourceManagerId = dto.ResourceManagerId is > 0 ? dto.ResourceManagerId : null;
            member.IsAvailable = dto.IsAvailable;
            member.HourlySalary = dto.HourlySalary;
            member.UpdatedAt = DateTime.UtcNow;

            _teamMemberRepo.SaveInclude(
                member,
                nameof(member.Title),
                nameof(member.YearsOfExperience),
                nameof(member.PhoneNumber),
                nameof(member.ResourceManagerId),
                nameof(member.IsAvailable),
                nameof(member.HourlySalary),
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

            var hasManagedTeam = await _teamMemberRepo
                .GetAll(t => t.ResourceManagerId == member.UserId && t.Id != id)
                .AnyAsync();

            if (hasManagedTeam)
                throw new AppException("Cannot delete a resource manager who still has team members assigned. Reassign their team first.", 400);

            var hasActiveProjectAssignments = await _projectAssignmentRepo
                .GetAll(a => a.TeamMemberId == id && a.IsActive)
                .AnyAsync();

            if (hasActiveProjectAssignments)
                throw new AppException("Cannot delete a team member who is assigned to a project. Unassign them first.", 400);

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

        public async Task<TeamMemberDto> DeactivateAsync(int id)
        {
            var member = await _teamMemberRepo
                .Query()
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

            if (member is null)
                throw new AppException("Resource not found.", 404);

            if (member.User is null || member.User.IsDeleted)
                throw new AppException("Resource not found.", 404);

            if (!member.User.IsActive)
                throw new AppException("Team member is already inactive.", 400);

            var hasActiveProjectAssignments = await _projectAssignmentRepo
                .GetAll(a => a.TeamMemberId == id && a.IsActive)
                .AnyAsync();

            if (hasActiveProjectAssignments)
                throw new AppException("Cannot deactivate a team member who is assigned to a project. Unassign them first.", 400);

            member.User.IsActive = false;
            member.User.RefreshToken = null;
            member.User.RefreshTokenExpiry = null;
            member.User.UpdatedAt = DateTime.UtcNow;
            member.IsAvailable = false;
            member.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                member.User,
                nameof(member.User.IsActive),
                nameof(member.User.RefreshToken),
                nameof(member.User.RefreshTokenExpiry),
                nameof(member.User.UpdatedAt));

            _teamMemberRepo.SaveInclude(
                member,
                nameof(member.IsAvailable),
                nameof(member.UpdatedAt));

            await _teamMemberRepo.SaveChangesAsync();

            return await GetByIdAsync(id);
        }

        public async Task<TeamMemberDto> ActivateAsync(int id)
        {
            var member = await _teamMemberRepo
                .Query()
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

            if (member is null)
                throw new AppException("Resource not found.", 404);

            if (member.User is null || member.User.IsDeleted)
                throw new AppException("Resource not found.", 404);

            if (member.User.IsActive)
                throw new AppException("Team member is already active.", 400);

            if (member.ResourceManagerId is > 0)
                await ValidateResourceManagerAsync(member.ResourceManagerId, id);

            member.User.IsActive = true;
            member.User.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                member.User,
                nameof(member.User.IsActive),
                nameof(member.User.UpdatedAt));

            await _teamMemberRepo.SaveChangesAsync();

            return await GetByIdAsync(id);
        }

        public async Task<TeamMemberDto> DeactivateManagedTeamMemberAsync(int resourceManagerUserId, int teamMemberId)
        {
            await EnsureTeamMemberManagedByAsync(resourceManagerUserId, teamMemberId);
            return await DeactivateAsync(teamMemberId);
        }

        public async Task<TeamMemberDto> ActivateManagedTeamMemberAsync(int resourceManagerUserId, int teamMemberId)
        {
            await EnsureTeamMemberManagedByAsync(resourceManagerUserId, teamMemberId);
            return await ActivateAsync(teamMemberId);
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
                .Include(t => t.ResourceManager)
                .OrderBy(t => t.User.FirstName)
                .ThenBy(t => t.User.LastName)
                .ToListAsync();

            var childrenByManager = members
                .Where(t => t.ResourceManagerId.HasValue)
                .GroupBy(t => t.ResourceManagerId!.Value)
                .ToDictionary(g => g.Key, g => g.ToList());

            var managers = members
                .Where(t => t.ResourceManager != null)
                .Select(t => t.ResourceManager!)
                .DistinctBy(u => u.Id)
                .OrderBy(u => u.LastName)
                .ThenBy(u => u.FirstName)
                .ToList();

            return managers.Select(manager => MapStructureForManager(manager, childrenByManager)).ToList();
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

        private async Task<CvStorageResultDto> StoreCvForMemberAsync(int userId, Stream content, string fileName)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            return await StoreCvAsync(member.Id, content, fileName);
        }

        private async Task<TeamMember> GetTeamMemberEntityForUserAsync(int userId)
        {
            var member = await BuildBaseQuery()
                .FirstOrDefaultAsync(t => t.UserId == userId && t.User.IsActive);

            if (member is null)
                throw new AppException("Team member profile not found for current user.", 404);

            return member;
        }

        private IQueryable<TeamMember> BuildListQuery()
        {
            return _teamMemberRepo.Query()
                .Where(t => !t.IsDeleted && !t.User.IsDeleted)
                .Include(t => t.User)
                .Include(t => t.ResourceManager)
                .AsSplitQuery();
        }

        private IQueryable<TeamMember> BuildBaseQuery()
        {
            return _teamMemberRepo.Query()
                .Where(t => !t.IsDeleted && !t.User.IsDeleted)
                .Include(t => t.User)
                .Include(t => t.ResourceManager)
                .Include(t => t.TeamMemberSkills)
                    .ThenInclude(ts => ts.Skill)
                        .ThenInclude(s => s.SkillCategory)
                .Include(t => t.Certificates.Where(c => !c.IsDeleted))
                .Include(t => t.Experiences.Where(e => !e.IsDeleted))
                .AsSplitQuery();
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

        private static TeamStructureDto MapStructureForManager(
            User manager,
            IReadOnlyDictionary<int, List<TeamMember>> childrenByManager)
        {
            childrenByManager.TryGetValue(manager.Id, out var children);

            return new TeamStructureDto
            {
                Id = manager.Id,
                FullName = UserDisplayName.FromUser(manager),
                Title = "Resource Manager",
                YearsOfExperience = 0,
                IsAvailable = manager.IsActive,
                TeamMembers = (children ?? new List<TeamMember>())
                    .OrderBy(t => t.User?.FirstName)
                    .ThenBy(t => t.User?.LastName)
                    .Select(MapStructureMember)
                    .ToList()
            };
        }

        private static TeamStructureDto MapStructureMember(TeamMember member)
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

        private async Task ValidateResourceManagerAsync(int? resourceManagerId, int? teamMemberId = null)
        {
            if (!resourceManagerId.HasValue || resourceManagerId.Value <= 0)
                return;

            var manager = await _userRepo
                .Query()
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u =>
                    u.Id == resourceManagerId.Value
                    && u.IsActive
                    && !u.IsDeleted);

            if (manager is null || manager.Role?.Name != nameof(UserRole.ResourceManager))
                throw new AppException("Resource not found.", 404);

            if (teamMemberId.HasValue)
            {
                var member = await _teamMemberRepo.GetByIDAsync(teamMemberId.Value);
                if (member is not null && member.UserId == resourceManagerId.Value)
                    throw new AppException("Invalid request.", 400);
            }
        }

        public async Task<PagedResponse<ResourceManagerUserDto>> GetResourceManagersAsync(ResourceManagerRequest request)
        {
            var query = _userRepo
                .Query()
                .Include(u => u.Role)
                .Where(u =>
                    u.Role.Name == nameof(UserRole.ResourceManager)
                    && !u.IsDeleted);

            if (request.IsActive.HasValue)
                query = query.Where(u => u.IsActive == request.IsActive.Value);
            else
                query = query.Where(u => u.IsActive);

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(u =>
                    u.FirstName.ToLower().Contains(searchKey)
                    || u.LastName.ToLower().Contains(searchKey)
                    || u.Email.ToLower().Contains(searchKey));
            }

            var totalCount = await query.CountAsync();
            var managers = await query
                .OrderBy(u => u.LastName)
                .ThenBy(u => u.FirstName)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<ResourceManagerUserDto>(
                managers.Select(MapResourceManagerUser).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<ResourceManagerUserDto> CreateResourceManagerAsync(CreateResourceManagerDto dto)
        {
            ValidateUserInput(dto.FirstName, dto.LastName, dto.Email, dto.Password);

            var normalizedEmail = NormalizeEmail(dto.Email);
            var emailExists = await _userRepo
                .GetAll(u => u.Email == normalizedEmail)
                .AnyAsync();

            if (emailExists)
                throw new AppException("Email already exists.", 400);

            var role = await _roleRepo
                .GetAll(r => r.Name == nameof(UserRole.ResourceManager))
                .FirstOrDefaultAsync();

            if (role is null)
                throw new AppException("Resource not found.", 404);

            var user = new User
            {
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = normalizedEmail,
                PasswordHash = HashPassword(dto.Password),
                RoleId = role.Id,
                IsEmailVerified = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _userRepo.AddAsync(user);
            await _userRepo.SaveChangesAsync();

            return MapResourceManagerUser(user);
        }

        public async Task<ResourceManagerUserDto> GetResourceManagerByIdAsync(int userId)
        {
            var user = await GetResourceManagerEntityAsync(userId, includeInactive: true);
            return MapResourceManagerUser(user);
        }

        public async Task<ResourceManagerUserDto> UpdateResourceManagerAsync(int userId, UpdateResourceManagerDto dto)
        {
            ValidateUserInput(dto.FirstName, dto.LastName, dto.Email);

            var user = await GetResourceManagerEntityAsync(userId, includeInactive: true);

            var normalizedEmail = NormalizeEmail(dto.Email);
            var emailExists = await _userRepo
                .GetAll(u => u.Email == normalizedEmail && u.Id != user.Id)
                .AnyAsync();

            if (emailExists)
                throw new AppException("Email already exists.", 400);

            user.FirstName = dto.FirstName.Trim();
            user.LastName = dto.LastName.Trim();
            user.Email = normalizedEmail;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                user,
                nameof(user.FirstName),
                nameof(user.LastName),
                nameof(user.Email),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();

            return MapResourceManagerUser(user);
        }

        public async Task<ResourceManagerUserDto> DeactivateResourceManagerAsync(int userId)
        {
            var user = await GetResourceManagerEntityAsync(userId, includeInactive: true);

            if (!user.IsActive)
                throw new AppException("Resource manager is already inactive.", 400);

            await EnsureResourceManagerCanBeRemovedAsync(user.Id);

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

            await _userRepo.SaveChangesAsync();

            return MapResourceManagerUser(user);
        }

        public async Task<ResourceManagerUserDto> ActivateResourceManagerAsync(int userId)
        {
            var user = await GetResourceManagerEntityAsync(userId, includeInactive: true);

            if (user.IsActive)
                throw new AppException("Resource manager is already active.", 400);

            user.IsActive = true;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                user,
                nameof(user.IsActive),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();

            return MapResourceManagerUser(user);
        }

        public async Task DeleteResourceManagerAsync(int userId)
        {
            var user = await GetResourceManagerEntityAsync(userId, includeInactive: true);

            await EnsureResourceManagerCanBeRemovedAsync(user.Id);

            user.IsActive = false;
            user.IsDeleted = true;
            user.DeletedAt = DateTime.UtcNow;
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                user,
                nameof(user.IsActive),
                nameof(user.IsDeleted),
                nameof(user.DeletedAt),
                nameof(user.RefreshToken),
                nameof(user.RefreshTokenExpiry),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();
        }

        public async Task<PagedResponse<SalesUserDto>> GetSalesUsersAsync(SalesUserRequest request)
        {
            var query = _userRepo
                .Query()
                .Include(u => u.Role)
                .Where(u =>
                    u.Role.Name == nameof(UserRole.Sales)
                    && !u.IsDeleted);

            if (request.IsActive.HasValue)
                query = query.Where(u => u.IsActive == request.IsActive.Value);
            else
                query = query.Where(u => u.IsActive);

            if (!string.IsNullOrWhiteSpace(request.searchKey))
            {
                var searchKey = Normalize(request.searchKey);
                query = query.Where(u =>
                    u.FirstName.ToLower().Contains(searchKey)
                    || u.LastName.ToLower().Contains(searchKey)
                    || u.Email.ToLower().Contains(searchKey));
            }

            var totalCount = await query.CountAsync();
            var users = await query
                .OrderBy(u => u.LastName)
                .ThenBy(u => u.FirstName)
                .Skip(GetSkipCount(request))
                .Take(GetPageSize(request))
                .ToListAsync();

            return new PagedResponse<SalesUserDto>(
                users.Select(MapSalesUser).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public async Task<SalesUserDto> CreateSalesUserAsync(CreateSalesUserDto dto)
        {
            ValidateUserInput(dto.FirstName, dto.LastName, dto.Email, dto.Password);

            var normalizedEmail = NormalizeEmail(dto.Email);
            var emailExists = await _userRepo
                .GetAll(u => u.Email == normalizedEmail)
                .AnyAsync();

            if (emailExists)
                throw new AppException("Email already exists.", 400);

            var role = await _roleRepo
                .GetAll(r => r.Name == nameof(UserRole.Sales))
                .FirstOrDefaultAsync();

            if (role is null)
                throw new AppException("Resource not found.", 404);

            var user = new User
            {
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = normalizedEmail,
                PasswordHash = HashPassword(dto.Password),
                RoleId = role.Id,
                IsEmailVerified = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _userRepo.AddAsync(user);
            await _userRepo.SaveChangesAsync();

            return MapSalesUser(user);
        }

        public async Task<SalesUserDto> GetSalesUserByIdAsync(int userId)
        {
            var user = await GetSalesUserEntityAsync(userId, includeInactive: true);
            return MapSalesUser(user);
        }

        public async Task<SalesUserDto> UpdateSalesUserAsync(int userId, UpdateSalesUserDto dto)
        {
            ValidateUserInput(dto.FirstName, dto.LastName, dto.Email);

            var user = await GetSalesUserEntityAsync(userId, includeInactive: true);

            var normalizedEmail = NormalizeEmail(dto.Email);
            var emailExists = await _userRepo
                .GetAll(u => u.Email == normalizedEmail && u.Id != user.Id)
                .AnyAsync();

            if (emailExists)
                throw new AppException("Email already exists.", 400);

            user.FirstName = dto.FirstName.Trim();
            user.LastName = dto.LastName.Trim();
            user.Email = normalizedEmail;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                user,
                nameof(user.FirstName),
                nameof(user.LastName),
                nameof(user.Email),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();

            return MapSalesUser(user);
        }

        public async Task<SalesUserDto> DeactivateSalesUserAsync(int userId)
        {
            var user = await GetSalesUserEntityAsync(userId, includeInactive: true);

            if (!user.IsActive)
                throw new AppException("Sales user is already inactive.", 400);

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

            await _userRepo.SaveChangesAsync();

            return MapSalesUser(user);
        }

        public async Task<SalesUserDto> ActivateSalesUserAsync(int userId)
        {
            var user = await GetSalesUserEntityAsync(userId, includeInactive: true);

            if (user.IsActive)
                throw new AppException("Sales user is already active.", 400);

            user.IsActive = true;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                user,
                nameof(user.IsActive),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();

            return MapSalesUser(user);
        }

        public async Task DeleteSalesUserAsync(int userId)
        {
            var user = await GetSalesUserEntityAsync(userId, includeInactive: true);

            user.IsActive = false;
            user.IsDeleted = true;
            user.DeletedAt = DateTime.UtcNow;
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                user,
                nameof(user.IsActive),
                nameof(user.IsDeleted),
                nameof(user.DeletedAt),
                nameof(user.RefreshToken),
                nameof(user.RefreshTokenExpiry),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();
        }

        public async Task<PagedResponse<TeamMemberDto>> GetManagedTeamMembersAsync(
            int resourceManagerUserId,
            TeamMemberRequest request)
        {
            request.ResourceManagerId = resourceManagerUserId;
            var query = BuildListQuery();

            if (request.Id.HasValue)
                query = query.Where(t => t.Id == request.Id.Value);

            if (request.UserId.HasValue)
                query = query.Where(t => t.UserId == request.UserId.Value);

            query = query.Where(t => t.ResourceManagerId == resourceManagerUserId);

            if (request.IsAvailable.HasValue)
                query = query.Where(t => t.IsAvailable == request.IsAvailable.Value);

            if (request.IsActive.HasValue)
                query = query.Where(t => t.User.IsActive == request.IsActive.Value);
            else
                query = query.Where(t => t.User.IsActive);

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
                members.Select(m => MapToListDto(m, includeResourceManagerName: false)).ToList(),
                totalCount,
                GetPageIndex(request),
                GetPageSize(request));
        }

        public Task<TeamMemberDto> GetManagedTeamMemberByIdAsync(int resourceManagerUserId, int teamMemberId)
        {
            return GetManagedTeamMemberInternalAsync(resourceManagerUserId, teamMemberId);
        }

        public async Task<TeamMemberDto> CreateManagedTeamMemberAsync(
            int resourceManagerUserId,
            CreateTeamMemberDto dto)
        {
            dto.ResourceManagerId = resourceManagerUserId;
            dto.HourlySalary = null;
            return await CreateAsync(dto);
        }

        public async Task<TeamMemberDto> UpdateManagedTeamMemberAsync(
            int resourceManagerUserId,
            int teamMemberId,
            UpdateTeamMemberDto dto)
        {
            await EnsureTeamMemberManagedByAsync(resourceManagerUserId, teamMemberId);
            dto.ResourceManagerId = resourceManagerUserId;
            return await UpdateAsync(teamMemberId, dto);
        }

        public async Task DeleteManagedTeamMemberAsync(int resourceManagerUserId, int teamMemberId)
        {
            await EnsureTeamMemberManagedByAsync(resourceManagerUserId, teamMemberId);
            await DeleteAsync(teamMemberId);
        }

        public async Task<TeamMemberDto> AssignSkillForResourceManagerAsync(
            int resourceManagerUserId,
            int teamMemberId,
            UpsertTeamMemberSkillDto dto)
        {
            await EnsureTeamMemberManagedByAsync(resourceManagerUserId, teamMemberId);
            return await AssignSkillAsync(teamMemberId, dto);
        }

        public async Task<TeamMemberDto> RemoveSkillForResourceManagerAsync(
            int resourceManagerUserId,
            int teamMemberId,
            int skillId)
        {
            await EnsureTeamMemberManagedByAsync(resourceManagerUserId, teamMemberId);
            return await RemoveSkillAsync(teamMemberId, skillId);
        }

        public async Task EnsureTeamMemberManagedByAsync(int resourceManagerUserId, int teamMemberId)
        {
            var member = await _teamMemberRepo
                .Query()
                .FirstOrDefaultAsync(t =>
                    t.Id == teamMemberId
                    && !t.IsDeleted
                    && t.ResourceManagerId == resourceManagerUserId);

            if (member is null)
                throw new AppException("You do not have access to this team member.", 403);
        }

        public Task ResetTeamMemberPasswordAsync(int teamMemberId, ResetTeamMemberPasswordDto dto)
            => ResetTeamMemberPasswordInternalAsync(teamMemberId, dto);

        public async Task ResetManagedTeamMemberPasswordAsync(
            int resourceManagerUserId,
            int teamMemberId,
            ResetTeamMemberPasswordDto dto)
        {
            await EnsureTeamMemberManagedByAsync(resourceManagerUserId, teamMemberId);
            await ResetTeamMemberPasswordInternalAsync(teamMemberId, dto);
        }

        private async Task ResetTeamMemberPasswordInternalAsync(int teamMemberId, ResetTeamMemberPasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 8)
                throw new AppException("Password must be at least 8 characters.", 400);

            var member = await _teamMemberRepo
                .Query()
                .Include(t => t.User)
                .ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(t => t.Id == teamMemberId && !t.IsDeleted);

            if (member is null)
                throw new AppException("Resource not found.", 404);

            if (member.User is null || member.User.IsDeleted || !member.User.IsActive)
                throw new AppException("Team member account is not active.", 400);

            if (member.User.Role?.Name != nameof(UserRole.TeamMember))
                throw new AppException("Password can only be reset for team member accounts.", 400);

            member.User.PasswordHash = HashPassword(dto.NewPassword);
            member.User.RefreshToken = null;
            member.User.RefreshTokenExpiry = null;
            member.User.PasswordResetToken = null;
            member.User.PasswordResetTokenExpiry = null;
            member.User.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                member.User,
                nameof(member.User.PasswordHash),
                nameof(member.User.RefreshToken),
                nameof(member.User.RefreshTokenExpiry),
                nameof(member.User.PasswordResetToken),
                nameof(member.User.PasswordResetTokenExpiry),
                nameof(member.User.UpdatedAt));

            await _userRepo.SaveChangesAsync();
        }

        private async Task<TeamMemberDto> GetManagedTeamMemberInternalAsync(
            int resourceManagerUserId,
            int teamMemberId)
        {
            await EnsureTeamMemberManagedByAsync(resourceManagerUserId, teamMemberId);

            var member = await BuildBaseQuery()
                .FirstOrDefaultAsync(t => t.Id == teamMemberId);

            if (member is null)
                throw new AppException("Resource not found.", 404);

            var dto = MapToDto(member);
            dto.ProjectNames = await GetActiveProjectNamesAsync(teamMemberId, resourceManagerUserId);
            return dto;
        }

        private static ResourceManagerUserDto MapResourceManagerUser(User user)
        {
            return new ResourceManagerUserDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                FullName = UserDisplayName.FromUser(user),
                IsActive = user.IsActive
            };
        }

        private static SalesUserDto MapSalesUser(User user)
        {
            return new SalesUserDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                FullName = UserDisplayName.FromUser(user),
                IsActive = user.IsActive
            };
        }

        private async Task<User> GetSalesUserEntityAsync(int userId, bool includeInactive = false)
        {
            var user = await _userRepo
                .Query()
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u =>
                    u.Id == userId
                    && !u.IsDeleted
                    && u.Role.Name == nameof(UserRole.Sales));

            if (user is null)
                throw new AppException("Resource not found.", 404);

            if (!includeInactive && !user.IsActive)
                throw new AppException("Resource not found.", 404);

            return user;
        }

        private async Task<User> GetResourceManagerEntityAsync(int userId, bool includeInactive = false)
        {
            var user = await _userRepo
                .Query()
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u =>
                    u.Id == userId
                    && !u.IsDeleted
                    && u.Role.Name == nameof(UserRole.ResourceManager));

            if (user is null)
                throw new AppException("Resource not found.", 404);

            if (!includeInactive && !user.IsActive)
                throw new AppException("Resource not found.", 404);

            return user;
        }

        private async Task EnsureResourceManagerCanBeRemovedAsync(int userId)
        {
            var hasManagedTeam = await _teamMemberRepo
                .GetAll(t => t.ResourceManagerId == userId && !t.IsDeleted)
                .AnyAsync();

            if (hasManagedTeam)
                throw new AppException("Cannot remove a resource manager who still has team members assigned. Reassign their team first.", 400);
        }

        private async Task ValidateSkillAssignmentsAsync(IEnumerable<UpsertTeamMemberSkillDto> assignments)
        {
            foreach (var assignment in assignments)
            {
                if (assignment.SkillId <= 0
                    || !await _skillRepo.GetAll(s => s.Id == assignment.SkillId && s.IsActive).AnyAsync())
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
                "resourcemanagerid" => isDescending ? query.OrderByDescending(t => t.ResourceManagerId) : query.OrderBy(t => t.ResourceManagerId),
                "isavailable" => isDescending ? query.OrderByDescending(t => t.IsAvailable) : query.OrderBy(t => t.IsAvailable),
                _ => isDescending ? query.OrderByDescending(t => t.Id) : query.OrderBy(t => t.Id)
            };
        }

        private static bool IsDescending(string sortDirection)
            => !string.Equals(sortDirection, "ASC", StringComparison.OrdinalIgnoreCase);

        private static int GetPageIndex(BaseApiRequest request)
            => request.PageIndex < 1 ? 1 : request.PageIndex;

        private static int GetPageSize(BaseApiRequest request)
            => request.PageSize < 1 ? 20 : request.PageSize;

        private static int GetSkipCount(BaseApiRequest request)
            => (GetPageIndex(request) - 1) * GetPageSize(request);

        private static string BuildFullName(string firstName, string lastName)
            => UserDisplayName.Build(firstName, lastName);

        private static string HashPassword(string password)
            => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

        private async Task<List<string>> GetActiveProjectNamesAsync(
            int teamMemberId,
            int? resourceManagerUserId = null)
        {
            var query = _projectAssignmentRepo
                .Query()
                .AsNoTracking()
                .Where(a =>
                    a.TeamMemberId == teamMemberId
                    && a.IsActive
                    && !a.IsDeleted
                    && !a.Project.IsDeleted);

            if (resourceManagerUserId is > 0)
            {
                query = query.Where(a =>
                    a.Project.ProjectResourceManagers.Any(rm =>
                        !rm.IsDeleted && rm.IsActive && rm.ResourceManagerUserId == resourceManagerUserId));
            }

            return await query
                .Select(a => a.Project.Name)
                .Distinct()
                .OrderBy(name => name)
                .ToListAsync();
        }

        private static TeamMemberDto MapToListDto(TeamMember member, bool includeResourceManagerName = true)
        {
            return new TeamMemberDto
            {
                Id = member.Id,
                FullName = UserDisplayName.FromTeamMember(member),
                Title = member.Title,
                Email = member.User?.Email ?? string.Empty,
                ResourceManagerId = member.ResourceManagerId,
                ResourceManagerName = includeResourceManagerName
                    ? UserDisplayName.FromUser(member.ResourceManager)
                    : null,
                IsAvailable = member.IsAvailable,
                IsActive = member.User?.IsActive ?? false,
            };
        }

        private static TeamMemberDto MapToDto(
            TeamMember member,
            ITeamCvStorageService cvStorage,
            ITeamProfileStorageService photoStorage,
            ITeamIntroVideoStorageService introVideoStorage)
        {
            var cvFileName = cvStorage.GetCvFileName(member.CV);
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
                CvFileName = string.IsNullOrWhiteSpace(cvFileName) ? null : cvFileName,
                CvDownloadUrl = string.IsNullOrWhiteSpace(member.CV) ? null : cvStorage.GetCvPublicUrl(member.CV),
                ProfilePhoto = member.ProfilePhoto ?? string.Empty,
                ProfilePhotoUrl = string.IsNullOrWhiteSpace(member.ProfilePhoto)
                    ? null
                    : photoStorage.GetPhotoPublicUrl(member.ProfilePhoto),
                IntroVideo = member.IntroVideo ?? string.Empty,
                IntroVideoUrl = string.IsNullOrWhiteSpace(member.IntroVideo)
                    ? null
                    : introVideoStorage.GetIntroVideoPublicUrl(member.IntroVideo),
                PhoneNumber = member.PhoneNumber,
                ResourceManagerId = member.ResourceManagerId,
                ResourceManagerName = UserDisplayName.FromUser(member.ResourceManager),
                IsAvailable = member.IsAvailable,
                IsActive = member.User?.IsActive ?? false,
                HourlySalary = member.HourlySalary,
                SkillAssignments = member.TeamMemberSkills
                    .OrderBy(s => s.Skill.Name)
                    .Select(MapSkill)
                    .ToList(),
                Certificates = member.Certificates
                    .OrderByDescending(c => c.IssuedDate)
                    .Select(c => new TeamMemberCertificateDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Issuer = c.Issuer,
                        IssuedDate = c.IssuedDate,
                        ExpiryDate = c.ExpiryDate
                    })
                    .ToList(),
                Experiences = member.Experiences
                    .OrderByDescending(e => e.StartDate)
                    .Select(e => new TeamMemberExperienceDto
                    {
                        Id = e.Id,
                        JobTitle = e.JobTitle,
                        Company = e.Company,
                        StartDate = e.StartDate,
                        EndDate = e.EndDate,
                        Description = e.Description,
                        DisplayOrder = e.DisplayOrder
                    })
                    .ToList()
            };
        }

        private TeamMemberDto MapToDto(TeamMember member)
            => MapToDto(member, _cvStorageService, _profileStorageService, _introVideoStorageService);

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
    }
}
