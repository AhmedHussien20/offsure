using OffshoreManagementSystem.Domain.Entities;

namespace OffsureManagementSystem.Infrastructure.Services
{
    internal static class TeamMemberBrowseFilters
    {
        public static IQueryable<TeamMember> ApplyNameSearch(IQueryable<TeamMember> query, string? nameSearch)
        {
            if (string.IsNullOrWhiteSpace(nameSearch))
                return query;

            var term = nameSearch.Trim().ToLower();
            return query.Where(t =>
                t.User.FirstName.ToLower().Contains(term)
                || t.User.LastName.ToLower().Contains(term)
                || (t.User.FirstName + " " + t.User.LastName).ToLower().Contains(term));
        }

        public static IQueryable<TeamMember> ApplySkillSearch(IQueryable<TeamMember> query, string? skillSearch)
        {
            if (string.IsNullOrWhiteSpace(skillSearch))
                return query;

            var term = skillSearch.Trim();
            return query.Where(t =>
                t.TeamMemberSkills.Any(ts =>
                    ts.Skill != null
                    && ts.Skill.Name.Contains(term)));
        }

        public static IQueryable<TeamMember> ApplyExperienceBand(IQueryable<TeamMember> query, string? band)
        {
            if (string.IsNullOrWhiteSpace(band))
                return query;

            return band.Trim() switch
            {
                "0-3" => query.Where(t => t.YearsOfExperience >= 0 && t.YearsOfExperience <= 3),
                "3-5" => query.Where(t => t.YearsOfExperience >= 3 && t.YearsOfExperience <= 5),
                "5+" => query.Where(t => t.YearsOfExperience >= 5),
                "10+" => query.Where(t => t.YearsOfExperience >= 10),
                _ => query
            };
        }
    }
}
