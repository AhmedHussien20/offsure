using System.Text.RegularExpressions;

namespace OffsureManagementSystem.Application.Common
{
    public static class ProjectDescriptionSkills
    {
        private static readonly Regex SkillsMarker = new(
            @"^@@SKILLS:\[(.*?)\]@@\r?\n?",
            RegexOptions.Compiled | RegexOptions.CultureInvariant);

        private static readonly Regex RoleSkillPrefix = new(
            @"^\[skill:(\d+)\]\s*",
            RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        public static List<int> ParseRequiredSkillIds(string? description)
        {
            if (string.IsNullOrWhiteSpace(description))
                return new List<int>();

            var match = SkillsMarker.Match(description);
            if (!match.Success || string.IsNullOrWhiteSpace(match.Groups[1].Value))
                return new List<int>();

            return match.Groups[1].Value
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0)
                .Where(id => id > 0)
                .Distinct()
                .OrderBy(id => id)
                .ToList();
        }

        public static string StripSkillsMarker(string? description)
        {
            if (string.IsNullOrWhiteSpace(description))
                return string.Empty;

            return SkillsMarker.Replace(description, string.Empty).Trim();
        }

        public static string EmbedRequiredSkillIds(string? cleanDescription, IEnumerable<int> skillIds)
        {
            var ids = skillIds?.Where(id => id > 0).Distinct().OrderBy(id => id).ToList() ?? new List<int>();
            var body = StripSkillsMarker(cleanDescription);

            if (ids.Count == 0)
                return body;

            var joined = string.Join(",", ids);
            return string.IsNullOrEmpty(body)
                ? $"@@SKILLS:[{joined}]@@"
                : $"@@SKILLS:[{joined}]@@\n{body}";
        }

        public static string FormatSkillRole(int skillId, string roleLabel)
            => $"[skill:{skillId}] {roleLabel.Trim()}";

        public static int? SkillIdFromRole(string? role)
        {
            if (string.IsNullOrWhiteSpace(role))
                return null;

            var match = RoleSkillPrefix.Match(role);
            if (!match.Success)
                return null;

            return int.TryParse(match.Groups[1].Value, out var id) ? id : null;
        }

        public static string StripSkillPrefixFromRole(string? role)
        {
            if (string.IsNullOrWhiteSpace(role))
                return string.Empty;

            return RoleSkillPrefix.Replace(role, string.Empty).Trim();
        }
    }
}
