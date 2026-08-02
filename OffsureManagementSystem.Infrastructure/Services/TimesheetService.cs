using Microsoft.EntityFrameworkCore;
using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Domain.Entities;
using OffsureManagementSystem.Application.Common;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.TimesheetDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities.Enum;
using ProjectResourceManager = OffshoreManagementSystem.Domain.Entities.ProjectResourceManager;
using TimesheetEntity = OffshoreManagementSystem.Domain.Entities.Timesheet;
using TimesheetEntryEntity = OffshoreManagementSystem.Domain.Entities.TimesheetEntry;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class TimesheetService : ITimesheetService
    {
        private readonly IRepository<TimesheetEntity> _timesheetRepo;
        private readonly IRepository<TimesheetEntryEntity> _entryRepo;
        private readonly IRepository<Project> _projectRepo;
        private readonly IRepository<TeamMember> _teamMemberRepo;
        private readonly IRepository<ProjectAssignment> _assignmentRepo;
        private readonly IRepository<ProjectResourceManager> _projectResourceManagerRepo;
        private readonly IRepository<ProjectMilestone> _milestoneRepo;

        public TimesheetService(
            IRepository<TimesheetEntity> timesheetRepo,
            IRepository<TimesheetEntryEntity> entryRepo,
            IRepository<Project> projectRepo,
            IRepository<TeamMember> teamMemberRepo,
            IRepository<ProjectAssignment> assignmentRepo,
            IRepository<ProjectResourceManager> projectResourceManagerRepo,
            IRepository<ProjectMilestone> milestoneRepo)
        {
            _timesheetRepo = timesheetRepo;
            _entryRepo = entryRepo;
            _projectRepo = projectRepo;
            _teamMemberRepo = teamMemberRepo;
            _assignmentRepo = assignmentRepo;
            _projectResourceManagerRepo = projectResourceManagerRepo;
            _milestoneRepo = milestoneRepo;
        }

        public async Task<TimesheetDayDto?> GetTimesheetDayAsync(int userId, int projectId, DateOnly workDate)
        {
            var member = await GetTeamMemberForUserAsync(userId);
            var project = await GetHourlyProjectAsync(projectId);
            await EnsureAssignedToHourlyProjectAsync(projectId, member.Id);

            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            if (workDate > today)
                return null;

            var sheet = await LoadTimesheetAsync(projectId, member.Id, workDate);
            if (sheet is null)
                return null;

            return MapTimesheetDay(sheet);
        }

        public async Task<TimesheetDayDto> UpsertTimesheetDayAsync(int userId, UpsertTimesheetDto dto)
        {
            if (dto.ProjectId <= 0)
                throw new AppException("Invalid request.", 400);

            var member = await GetTeamMemberForUserAsync(userId);
            var project = await GetHourlyProjectAsync(dto.ProjectId);
            await EnsureAssignedToHourlyProjectAsync(dto.ProjectId, member.Id);
            EnsureProjectAllowsTimesheetLogging(project);
            await EnsureWorkDateAllowedAsync(project, dto.WorkDate);

            var parsed = ParseAndValidateEntries(dto.Entries);
            if (parsed.TotalHours > 24m)
                throw new AppException("Total hours in a day cannot exceed 24.", 400);

            var sheet = await GetOrCreateTimesheetAsync(dto.ProjectId, member.Id, dto.WorkDate);

            foreach (var existing in sheet.Entries.Where(e => !e.IsDeleted).ToList())
            {
                existing.IsDeleted = true;
                existing.DeletedAt = DateTime.UtcNow;
                existing.DeletedBy = userId;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await AddParsedEntriesAsync(sheet, parsed.Entries);

            sheet.UpdatedAt = DateTime.UtcNow;
            await _timesheetRepo.SaveChangesAsync();

            var reloaded = await LoadTimesheetAsync(dto.ProjectId, member.Id, dto.WorkDate);
            return MapTimesheetDay(reloaded!);
        }

        public async Task<TimesheetDayDto> AppendTimesheetEntriesAsync(int userId, AppendTimesheetEntriesDto dto)
        {
            if (dto.ProjectId <= 0)
                throw new AppException("Invalid request.", 400);

            var member = await GetTeamMemberForUserAsync(userId);
            var project = await GetHourlyProjectAsync(dto.ProjectId);
            await EnsureAssignedToHourlyProjectAsync(dto.ProjectId, member.Id);
            EnsureProjectAllowsTimesheetLogging(project);
            await EnsureWorkDateAllowedAsync(project, dto.WorkDate);

            var parsed = ParseAndValidateEntries(dto.Entries);
            var sheet = await GetOrCreateTimesheetAsync(dto.ProjectId, member.Id, dto.WorkDate);
            var existingEntries = sheet.Entries.Where(e => !e.IsDeleted).ToList();

            var combinedSlots = existingEntries
                .Select(e => (e.StartMinutes, e.EndMinutes))
                .Concat(parsed.Entries.Select(e => (e.Start, e.End)))
                .ToList();
            TimesheetTimeHelper.ValidateNoOverlaps(combinedSlots);

            var totalHours = existingEntries.Sum(e => e.Hours) + parsed.TotalHours;
            if (totalHours > 24m)
                throw new AppException("Total hours in a day cannot exceed 24.", 400);

            await AddParsedEntriesAsync(sheet, parsed.Entries);

            sheet.UpdatedAt = DateTime.UtcNow;
            await _timesheetRepo.SaveChangesAsync();

            var reloaded = await LoadTimesheetAsync(dto.ProjectId, member.Id, dto.WorkDate);
            return MapTimesheetDay(reloaded!);
        }

        public async Task<TimesheetDayDto> UpdateTimesheetEntryAsync(
            int userId,
            int entryId,
            UpdateTimesheetEntryDto dto)
        {
            var member = await GetTeamMemberForUserAsync(userId);

            var entry = await _entryRepo
                .Query()
                .IgnoreQueryFilters()
                .Include(e => e.Timesheet)
                .FirstOrDefaultAsync(e => e.Id == entryId && !e.IsDeleted);

            if (entry?.Timesheet is null || entry.Timesheet.IsDeleted)
                throw new AppException("Time entry not found.", 404);

            if (entry.Timesheet.TeamMemberId != member.Id)
                throw new AppException("You can only edit your own time entries.", 403);

            var project = await GetHourlyProjectAsync(entry.Timesheet.ProjectId);
            await EnsureAssignedToHourlyProjectAsync(entry.Timesheet.ProjectId, member.Id);
            EnsureProjectAllowsTimesheetLogging(project);
            await EnsureWorkDateAllowedAsync(project, entry.Timesheet.WorkDate);

            if (string.IsNullOrWhiteSpace(dto.Description))
                throw new AppException("Each entry needs a description.", 400);

            if (!TimesheetTimeHelper.TryParseTime(dto.StartTime, out var start)
                || !TimesheetTimeHelper.TryParseTime(dto.EndTime, out var end))
            {
                throw new AppException("Invalid time format. Use HH:mm in 10-minute steps.", 400);
            }

            TimesheetTimeHelper.ValidateEntryTimes(start, end);

            var otherEntries = await _entryRepo
                .Query()
                .IgnoreQueryFilters()
                .Where(e =>
                    !e.IsDeleted
                    && e.TimesheetId == entry.TimesheetId
                    && e.Id != entryId)
                .ToListAsync();

            var slots = otherEntries
                .Select(e => (e.StartMinutes, e.EndMinutes))
                .Append((start, end))
                .ToList();
            TimesheetTimeHelper.ValidateNoOverlaps(slots);

            var totalHours = otherEntries.Sum(e => e.Hours)
                + TimesheetTimeHelper.CalculateHours(start, end);
            if (totalHours > 24m)
                throw new AppException("Total hours in a day cannot exceed 24.", 400);

            entry.StartMinutes = start;
            entry.EndMinutes = end;
            entry.Description = dto.Description.Trim();
            entry.Hours = TimesheetTimeHelper.CalculateHours(start, end);
            entry.UpdatedAt = DateTime.UtcNow;
            entry.Timesheet.UpdatedAt = DateTime.UtcNow;

            await _timesheetRepo.SaveChangesAsync();

            var reloaded = await LoadTimesheetAsync(
                entry.Timesheet.ProjectId,
                member.Id,
                entry.Timesheet.WorkDate);
            return MapTimesheetDay(reloaded!);
        }

        public async Task<TimesheetDayDto> DeleteTimesheetEntryAsync(int userId, int entryId)
        {
            var member = await GetTeamMemberForUserAsync(userId);

            var entry = await _entryRepo
                .Query()
                .IgnoreQueryFilters()
                .Include(e => e.Timesheet)
                .FirstOrDefaultAsync(e => e.Id == entryId && !e.IsDeleted);

            if (entry?.Timesheet is null || entry.Timesheet.IsDeleted)
                throw new AppException("Time entry not found.", 404);

            if (entry.Timesheet.TeamMemberId != member.Id)
                throw new AppException("You can only delete your own time entries.", 403);

            var project = await GetHourlyProjectAsync(entry.Timesheet.ProjectId);
            await EnsureAssignedToHourlyProjectAsync(entry.Timesheet.ProjectId, member.Id);
            EnsureProjectAllowsTimesheetLogging(project);

            var projectId = entry.Timesheet.ProjectId;
            var workDate = entry.Timesheet.WorkDate;

            entry.IsDeleted = true;
            entry.DeletedAt = DateTime.UtcNow;
            entry.DeletedBy = userId;
            entry.UpdatedAt = DateTime.UtcNow;
            entry.Timesheet.UpdatedAt = DateTime.UtcNow;

            await _timesheetRepo.SaveChangesAsync();

            var reloaded = await LoadTimesheetAsync(projectId, member.Id, workDate);
            return MapTimesheetDay(reloaded!);
        }

        public async Task<HourlyProjectOverviewDto> GetHourlyProjectOverviewAsync(int userId, string role, int projectId)
        {
            var project = await GetHourlyProjectAsync(projectId);
            var isResourceManager = string.Equals(role, "ResourceManager", StringComparison.OrdinalIgnoreCase);

            if (isResourceManager)
                await EnsureResourceManagerCanAccessProjectAsync(userId, projectId);

            var allowedIds = isResourceManager
                ? await GetManagedTeamMemberIdsAsync(userId, projectId)
                : null;

            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            var projectStart = DateOnly.FromDateTime(project.StartDate.Date);
            var (weekStart, weekEnd) = TimesheetTimeHelper.ResolveReportRange(
                TimesheetReportPeriod.Week,
                projectStart,
                today);

            var weekEntries = FilterEntriesForRole(
                await LoadEntryRowsAsync(projectId, null, weekStart, today),
                allowedIds);
            var allEntries = FilterEntriesForRole(
                await LoadEntryRowsAsync(projectId, null, projectStart, today),
                allowedIds);

            var totalHours = allEntries.Sum(e => e.Hours);
            var weekHours = weekEntries.Sum(e => e.Hours);
            var billingRate = project.HourlyRate ?? 0m;

            var weekDays = new List<HourlyProjectDaySummaryDto>();
            for (var d = weekStart; d <= weekEnd; d = d.AddDays(1))
            {
                var dayHours = weekEntries.Where(e => e.WorkDate == d).Sum(e => e.Hours);
                weekDays.Add(new HourlyProjectDaySummaryDto
                {
                    Date = d,
                    DayLabel = d.ToString("ddd d"),
                    Hours = dayHours,
                    IsToday = d == today
                });
            }

            var assignments = await _assignmentRepo
                .GetAll(a =>
                    a.ProjectId == projectId
                    && a.IsActive
                    && (allowedIds == null || allowedIds.Contains(a.TeamMemberId)))
                .Include(a => a.TeamMember)
                .ThenInclude(t => t!.User)
                .ToListAsync();

            var assignmentMap = assignments
                .GroupBy(a => a.TeamMemberId)
                .ToDictionary(g => g.Key, g => g.First());

            var resources = allEntries
                .GroupBy(e => e.TeamMemberId)
                .Select(g =>
                {
                    assignmentMap.TryGetValue(g.Key, out var assignment);
                    return new HourlyProjectResourceSummaryDto
                    {
                        TeamMemberId = g.Key,
                        TeamMemberName = assignment is not null
                            ? UserDisplayName.FromTeamMember(assignment.TeamMember)
                            : g.First().TeamMemberName,
                        Role = assignment?.Role ?? "—",
                        CostRate = assignment?.HourlyRate,
                        TotalHours = g.Sum(e => e.Hours)
                    };
                })
                .Where(r => r.TotalHours > 0)
                .OrderByDescending(r => r.TotalHours)
                .ToList();

            return new HourlyProjectOverviewDto
            {
                HourlyRate = isResourceManager ? 0m : billingRate,
                TotalHoursLogged = totalHours,
                ThisWeekHours = weekHours,
                EstimatedRevenue = isResourceManager
                    ? 0m
                    : Math.Round(billingRate * totalHours, 2, MidpointRounding.AwayFromZero),
                ThisWeek = weekDays,
                Resources = resources
            };
        }

        public async Task<TimesheetReportDto> GetReportAsync(
            int userId,
            string role,
            TimesheetReportRequest request)
        {
            if (request.ProjectId <= 0)
                throw new AppException("Project is required.", 400);

            var project = await GetHourlyProjectAsync(request.ProjectId);
            var isResourceManager = string.Equals(role, "ResourceManager", StringComparison.OrdinalIgnoreCase);
            var isTeamMember = string.Equals(role, "TeamMember", StringComparison.OrdinalIgnoreCase);

            if (isResourceManager)
                await EnsureResourceManagerCanAccessProjectAsync(userId, request.ProjectId);

            int? teamMemberFilter = request.TeamMemberId;
            if (isTeamMember)
            {
                var member = await GetTeamMemberForUserAsync(userId);
                await EnsureAssignedToHourlyProjectAsync(request.ProjectId, member.Id);
                if (teamMemberFilter.HasValue && teamMemberFilter.Value != member.Id)
                    throw new AppException("You can only view your own time entries.", 403);
                teamMemberFilter = member.Id;
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            var projectStart = DateOnly.FromDateTime(project.StartDate.Date);
            DateOnly rangeStart;
            DateOnly rangeEnd;

            if (request.RangeStart.HasValue && request.RangeEnd.HasValue)
            {
                rangeStart = request.RangeStart.Value;
                rangeEnd = request.RangeEnd.Value;
                if (rangeEnd < rangeStart)
                    throw new AppException("End date must be on or after start date.", 400);

                if (!isTeamMember && rangeStart < projectStart)
                    rangeStart = projectStart;
                if (rangeEnd > today)
                    rangeEnd = today;
            }
            else
            {
                (rangeStart, rangeEnd) = TimesheetTimeHelper.ResolveReportRange(
                    request.Period,
                    projectStart,
                    today);
            }

            if (isResourceManager)
            {
                var allowedIds = await GetManagedTeamMemberIdsAsync(userId, request.ProjectId);
                if (teamMemberFilter.HasValue && !allowedIds.Contains(teamMemberFilter.Value))
                    throw new AppException("You can only view timesheets for your own team members.", 403);
            }

            var query = await LoadEntryRowsAsync(request.ProjectId, teamMemberFilter, rangeStart, rangeEnd);

            if (isResourceManager)
            {
                var allowedIds = await GetManagedTeamMemberIdsAsync(userId, request.ProjectId);
                query = query.Where(e => allowedIds.Contains(e.TeamMemberId)).ToList();
            }

            if (request.ResourceManagerUserId.HasValue
                && string.Equals(role, "Administrator", StringComparison.OrdinalIgnoreCase))
            {
                var rmAssigned = await _projectResourceManagerRepo
                    .GetAll(r =>
                        r.ProjectId == request.ProjectId
                        && r.IsActive
                        && !r.IsDeleted
                        && r.ResourceManagerUserId == request.ResourceManagerUserId.Value)
                    .AnyAsync();

                if (!rmAssigned)
                    throw new AppException("Resource manager is not assigned to this project.", 403);

                var rmTeamIds = await GetManagedTeamMemberIdsAsync(
                    request.ResourceManagerUserId.Value,
                    request.ProjectId);
                query = query.Where(e => rmTeamIds.Contains(e.TeamMemberId)).ToList();
            }

            var rows = query
                .OrderByDescending(e => e.WorkDate)
                .ThenBy(e => e.TeamMemberName)
                .ThenBy(e => e.StartMinutes)
                .ToList();

            var totalHours = rows.Sum(r => r.Hours);
            var billingRate = project.HourlyRate ?? 0m;

            decimal? totalCost = null;
            if (string.Equals(role, "Administrator", StringComparison.OrdinalIgnoreCase)
                || string.Equals(role, "ResourceManager", StringComparison.OrdinalIgnoreCase))
            {
                var costRates = await _assignmentRepo
                    .GetAll(a => a.ProjectId == request.ProjectId && a.IsActive)
                    .ToDictionaryAsync(a => a.TeamMemberId, a => a.HourlyRate ?? 0m);

                totalCost = rows.Sum(r =>
                    costRates.TryGetValue(r.TeamMemberId, out var rate) ? rate * r.Hours : 0m);
            }

            return new TimesheetReportDto
            {
                ProjectId = project.Id,
                ProjectName = project.Name,
                RangeStart = rangeStart,
                RangeEnd = rangeEnd,
                TotalHours = totalHours,
                EstimatedRevenue = string.Equals(role, "Administrator", StringComparison.OrdinalIgnoreCase)
                    ? Math.Round(billingRate * totalHours, 2, MidpointRounding.AwayFromZero)
                    : null,
                TotalCost = totalCost,
                Rows = rows.Select(r => new TimesheetReportRowDto
                {
                    WorkDate = r.WorkDate,
                    TeamMemberId = r.TeamMemberId,
                    TeamMemberName = r.TeamMemberName,
                    StartTime = TimesheetTimeHelper.FormatTime(r.StartMinutes),
                    EndTime = TimesheetTimeHelper.FormatTime(r.EndMinutes),
                    Description = r.Description,
                    Hours = r.Hours
                }).ToList()
            };
        }

        private async Task<TeamMember> GetTeamMemberForUserAsync(int userId)
        {
            var member = await _teamMemberRepo
                .Query()
                .FirstOrDefaultAsync(t => t.UserId == userId && !t.IsDeleted);

            if (member is null)
                throw new AppException("Team member profile not found.", 404);

            return member;
        }

        private async Task EnsureAssignedToHourlyProjectAsync(int projectId, int teamMemberId)
        {
            var project = await GetHourlyProjectAsync(projectId);

            var assigned = await _assignmentRepo
                .GetAll(a => a.ProjectId == projectId && a.TeamMemberId == teamMemberId && a.IsActive)
                .AnyAsync();

            if (!assigned)
                throw new AppException("You are not assigned to this project.", 403);
        }

        private async Task<Project> GetHourlyProjectAsync(int projectId)
        {
            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null || project.IsDeleted)
                throw new AppException("Resource not found.", 404);

            if (project.BudgetType != ProjectBudgetType.Hourly)
                throw new AppException("Timesheets are only available for hourly projects.", 400);

            return project;
        }

        private async Task<TimesheetEntity> GetOrCreateTimesheetAsync(int projectId, int teamMemberId, DateOnly workDate)
        {
            var sheet = await _timesheetRepo
                .Query()
                .IgnoreQueryFilters()
                .Include(t => t.Entries.Where(e => !e.IsDeleted))
                .FirstOrDefaultAsync(t =>
                    t.ProjectId == projectId
                    && t.TeamMemberId == teamMemberId
                    && t.WorkDate == workDate
                    && !t.IsDeleted);

            if (sheet is not null)
                return sheet;

            sheet = new TimesheetEntity
            {
                ProjectId = projectId,
                TeamMemberId = teamMemberId,
                WorkDate = workDate,
                CreatedAt = DateTime.UtcNow
            };
            await _timesheetRepo.AddAsync(sheet);
            await _timesheetRepo.SaveChangesAsync();

            return sheet;
        }

        private async Task AddParsedEntriesAsync(
            TimesheetEntity sheet,
            IReadOnlyList<(int Start, int End, string Description)> entries)
        {
            foreach (var entry in entries)
            {
                await _entryRepo.AddAsync(new TimesheetEntryEntity
                {
                    TimesheetId = sheet.Id,
                    StartMinutes = entry.Start,
                    EndMinutes = entry.End,
                    Description = entry.Description,
                    Hours = TimesheetTimeHelper.CalculateHours(entry.Start, entry.End),
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        private static void EnsureProjectAllowsTimesheetLogging(Project project)
        {
            switch (project.Status)
            {
                case ProjectStatus.Cancelled:
                    throw new AppException("This project is cancelled. Time logging is not allowed.", 400);
                case ProjectStatus.Completed:
                    throw new AppException("This project is completed. Time logging is not allowed.", 400);
                case ProjectStatus.OnHold:
                    throw new AppException("This project is on hold. Time logging is not allowed.", 400);
            }
        }

        private async Task EnsureWorkDateAllowedAsync(Project project, DateOnly workDate)
        {
            var projectStart = DateOnly.FromDateTime(project.StartDate.Date);
            if (workDate < projectStart)
                throw new AppException("Cannot log time before the project start date.", 400);

            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            if (workDate > today)
                throw new AppException("Cannot log time for future dates.", 400);

            var projectEnd = await ResolveProjectEndDateAsync(project);
            if (projectEnd.HasValue && workDate > projectEnd.Value)
                throw new AppException("Cannot log time after the project end date.", 400);
        }

        private async Task<DateOnly?> ResolveProjectEndDateAsync(Project project)
        {
            if (project.UsesMilestones)
            {
                var milestoneEnds = await _milestoneRepo
                    .GetAll(m => m.ProjectId == project.Id && !m.IsDeleted && m.EndDate.HasValue)
                    .Select(m => m.EndDate!.Value)
                    .ToListAsync();

                if (milestoneEnds.Count > 0)
                    return milestoneEnds.Max(d => DateOnly.FromDateTime(d.Date));
            }

            if (project.TargetEndDate.HasValue)
                return DateOnly.FromDateTime(project.TargetEndDate.Value.Date);

            return null;
        }

        private async Task<TimesheetEntity?> LoadTimesheetAsync(int projectId, int teamMemberId, DateOnly workDate)
        {
            return await _timesheetRepo
                .Query()
                .IgnoreQueryFilters()
                .Include(t => t.Project)
                .Include(t => t.TeamMember)
                .ThenInclude(m => m!.User)
                .Include(t => t.Entries.Where(e => !e.IsDeleted))
                .FirstOrDefaultAsync(t =>
                    t.ProjectId == projectId
                    && t.TeamMemberId == teamMemberId
                    && t.WorkDate == workDate
                    && !t.IsDeleted);
        }

        private static TimesheetDayDto MapTimesheetDay(TimesheetEntity sheet)
        {
            var entries = sheet.Entries
                .Where(e => !e.IsDeleted)
                .OrderBy(e => e.StartMinutes)
                .Select(e => new TimesheetEntryDto
                {
                    Id = e.Id,
                    StartTime = TimesheetTimeHelper.FormatTime(e.StartMinutes),
                    EndTime = TimesheetTimeHelper.FormatTime(e.EndMinutes),
                    Description = e.Description,
                    Hours = e.Hours
                })
                .ToList();

            return new TimesheetDayDto
            {
                Id = sheet.Id,
                ProjectId = sheet.ProjectId,
                ProjectName = sheet.Project?.Name ?? string.Empty,
                TeamMemberId = sheet.TeamMemberId,
                TeamMemberName = UserDisplayName.FromTeamMember(sheet.TeamMember),
                WorkDate = sheet.WorkDate,
                TotalHours = entries.Sum(e => e.Hours),
                Entries = entries
            };
        }

        private static (List<(int Start, int End, string Description)> Entries, decimal TotalHours) ParseAndValidateEntries(
            IReadOnlyList<UpsertTimesheetEntryDto> entries)
        {
            if (entries.Count == 0)
                throw new AppException("Add at least one time entry.", 400);

            var parsed = new List<(int Start, int End, string Description)>();
            foreach (var entry in entries)
            {
                if (string.IsNullOrWhiteSpace(entry.Description))
                    throw new AppException("Each entry needs a description.", 400);

                if (!TimesheetTimeHelper.TryParseTime(entry.StartTime, out var start)
                    || !TimesheetTimeHelper.TryParseTime(entry.EndTime, out var end))
                {
                    throw new AppException("Invalid time format. Use HH:mm in 10-minute steps.", 400);
                }

                TimesheetTimeHelper.ValidateEntryTimes(start, end);
                parsed.Add((start, end, entry.Description.Trim()));
            }

            TimesheetTimeHelper.ValidateNoOverlaps(parsed.Select(p => (p.Start, p.End)).ToList());
            var total = TimesheetTimeHelper.SumHours(parsed.Select(p => (p.Start, p.End)));
            return (parsed, total);
        }

        private async Task<List<EntryRow>> LoadEntryRowsAsync(
            int projectId,
            int? teamMemberId,
            DateOnly rangeStart,
            DateOnly rangeEnd)
        {
            var query = _entryRepo
                .Query()
                .IgnoreQueryFilters()
                .Include(e => e.Timesheet)
                .ThenInclude(t => t!.TeamMember)
                .ThenInclude(m => m!.User)
                .Where(e =>
                    !e.IsDeleted
                    && e.Timesheet != null
                    && !e.Timesheet.IsDeleted
                    && e.Timesheet.ProjectId == projectId
                    && e.Timesheet.WorkDate >= rangeStart
                    && e.Timesheet.WorkDate <= rangeEnd);

            if (teamMemberId.HasValue)
                query = query.Where(e => e.Timesheet!.TeamMemberId == teamMemberId.Value);

            var entries = await query.ToListAsync();

            return entries
                .Select(e => new EntryRow
                {
                    WorkDate = e.Timesheet!.WorkDate,
                    TeamMemberId = e.Timesheet.TeamMemberId,
                    TeamMemberName = UserDisplayName.FromTeamMember(e.Timesheet.TeamMember),
                    StartMinutes = e.StartMinutes,
                    EndMinutes = e.EndMinutes,
                    Description = e.Description,
                    Hours = e.Hours
                })
                .ToList();
        }

        private async Task<HashSet<int>> GetManagedTeamMemberIdsAsync(int rmUserId, int projectId)
        {
            var ids = await _teamMemberRepo
                .Query()
                .Where(t => t.ResourceManagerId == rmUserId && !t.IsDeleted)
                .Select(t => t.Id)
                .ToListAsync();

            if (ids.Count == 0)
                return new HashSet<int>();

            var assigned = await _assignmentRepo
                .GetAll(a => a.ProjectId == projectId && a.IsActive && ids.Contains(a.TeamMemberId))
                .Select(a => a.TeamMemberId)
                .ToListAsync();

            var withLoggedHours = await _entryRepo
                .Query()
                .IgnoreQueryFilters()
                .Where(e =>
                    !e.IsDeleted
                    && e.Timesheet != null
                    && !e.Timesheet.IsDeleted
                    && e.Timesheet.ProjectId == projectId
                    && ids.Contains(e.Timesheet.TeamMemberId))
                .Select(e => e.Timesheet!.TeamMemberId)
                .Distinct()
                .ToListAsync();

            return assigned.Concat(withLoggedHours).ToHashSet();
        }

        private static List<EntryRow> FilterEntriesForRole(List<EntryRow> entries, HashSet<int>? allowedIds)
        {
            if (allowedIds is null)
                return entries;

            return entries.Where(e => allowedIds.Contains(e.TeamMemberId)).ToList();
        }

        private async Task EnsureResourceManagerCanAccessProjectAsync(int resourceManagerUserId, int projectId)
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

            var hasManagedMember = await _assignmentRepo
                .GetAll(a =>
                    a.ProjectId == projectId
                    && a.IsActive
                    && a.TeamMember.ResourceManagerId == resourceManagerUserId
                    && !a.TeamMember.IsDeleted)
                .AnyAsync();

            if (!hasManagedMember)
                throw new AppException("You do not have access to this project.", 403);
        }

        private sealed class EntryRow
        {
            public DateOnly WorkDate { get; init; }
            public int TeamMemberId { get; init; }
            public string TeamMemberName { get; init; } = string.Empty;
            public int StartMinutes { get; init; }
            public int EndMinutes { get; init; }
            public string Description { get; init; } = string.Empty;
            public decimal Hours { get; init; }
        }
    }
}
