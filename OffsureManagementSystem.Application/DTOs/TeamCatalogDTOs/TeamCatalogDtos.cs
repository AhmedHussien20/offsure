using OffsureManagementSystem.Application.Common.Requests;

namespace OffsureManagementSystem.Application.DTOs.TeamCatalogDTOs
{
    public class TeamRequest : BaseApiRequest
    {
        public bool? IsActive { get; set; }
    }

    public class CreateTeamDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public List<int>? TeamMemberIds { get; set; }
    }

    public class UpdateTeamDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public List<int>? TeamMemberIds { get; set; }
    }

    public class TeamDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        /// <summary>Public URL of the uploaded cover; null means the UI draws the generated cover.</summary>
        public string? CoverImageUrl { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public int MemberCount { get; set; }
        /// <summary>Most common skills among the team's members, most frequent first.</summary>
        public List<string> TopSkills { get; set; } = new();
    }

    public class SetTeamMembersDto
    {
        public List<int> TeamMemberIds { get; set; } = new();
    }

    /// <summary>A team member row for the admin "manage members" picker.</summary>
    public class TeamMemberOptionDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? ProfilePhotoUrl { get; set; }
        public int? TeamId { get; set; }
        public string? TeamName { get; set; }
        /// <summary>Active skill names, so the admin screens can preview the team card's top skills.</summary>
        public List<string> Skills { get; set; } = new();
    }

    public class TeamCatalogRequest
    {
        /// <summary>Matches team name/description or any member skill.</summary>
        public string? SearchKey { get; set; }
    }

    public class TeamCatalogDto
    {
        public List<TeamCatalogCardDto> Teams { get; set; } = new();
        /// <summary>Active specialists not shown under any active team.</summary>
        public int UnassignedCount { get; set; }
        public int TotalSpecialists { get; set; }
    }

    public class TeamCatalogCardDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? CoverImageUrl { get; set; }
        public int MemberCount { get; set; }
        public List<string> TopSkills { get; set; } = new();
        /// <summary>Distinct skills across the team (for the "+N" chip).</summary>
        public int SkillCount { get; set; }
        /// <summary>When searching by technology: the member skill that matched, if the team name did not.</summary>
        public string? MatchedSkill { get; set; }
        public List<TeamCatalogMemberPreviewDto> MemberPreviews { get; set; } = new();
    }

    public class TeamCatalogMemberPreviewDto
    {
        public string FullName { get; set; } = string.Empty;
        public string? ProfilePhotoUrl { get; set; }
    }
}
