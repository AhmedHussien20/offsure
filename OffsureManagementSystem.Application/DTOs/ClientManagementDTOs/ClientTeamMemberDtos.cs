using OffsureManagementSystem.Application.Common.Requests;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.Application.DTOs.ClientManagementDTOs
{
    public class ClientTeamMemberBrowseRequest : BaseApiRequest
    {
        public string? NameSearch { get; set; }
        public string? SkillSearch { get; set; }
        /// <summary>0-3, 3-5, 5+, or 10+</summary>
        public string? ExperienceBand { get; set; }
        public int? ProjectId { get; set; }
    }

    public class ClientTeamMemberCardDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int YearsOfExperience { get; set; }
        public string? ProfilePhotoUrl { get; set; }
        public List<string> Skills { get; set; } = new();
        public List<string> ProjectNames { get; set; } = new();
    }

    public class ClientTeamMemberDetailDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int YearsOfExperience { get; set; }
        public string? ProfilePhotoUrl { get; set; }
        public string? IntroVideoUrl { get; set; }
        public List<string> Skills { get; set; } = new();
        public List<string> ProjectNames { get; set; } = new();
        public List<ClientTeamMemberCertificateDto> Certificates { get; set; } = new();
        public List<ClientTeamMemberExperienceDto> Experiences { get; set; } = new();
    }

    public class ClientTeamMemberCertificateDto
    {
        public string Name { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public DateOnly IssuedDate { get; set; }
        public DateOnly? ExpiryDate { get; set; }
    }

    public class ClientTeamMemberExperienceDto
    {
        public string JobTitle { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public DateOnly StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string Description { get; set; } = string.Empty;
    }
}
