using System;
using System.Collections.Generic;
using OffsureManagementSystem.Application.Common.Requests;

namespace OffsureManagementSystem.Application.DTOs.TeamManagementDTOs
{
    public class TeamMemberRequest : BaseApiRequest
    {
        public int? UserId { get; set; }
        public int? ResourceManagerId { get; set; }
        public bool? IsAvailable { get; set; }
        public bool? IsActive { get; set; }
        public int? SkillId { get; set; }
    }

    public class ResourceManagerRequest : BaseApiRequest
    {
        public bool? IsActive { get; set; }
    }

    public class CreateResourceManagerDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UpdateResourceManagerDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

    public class ResourceManagerUserDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class CreateTeamMemberDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int YearsOfExperience { get; set; }
        public string? PhoneNumber { get; set; }
        public int? ResourceManagerId { get; set; }
        public bool IsAvailable { get; set; } = true;
        public decimal? HourlySalary { get; set; }
        public List<UpsertTeamMemberSkillDto> SkillAssignments { get; set; } = new();
    }

    public class UpdateTeamMemberDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int YearsOfExperience { get; set; }
        public string? PhoneNumber { get; set; }
        public int? ResourceManagerId { get; set; }
        public bool IsAvailable { get; set; } = true;
        public decimal? HourlySalary { get; set; }
        public List<UpsertTeamMemberSkillDto> SkillAssignments { get; set; } = new();
    }

    public class UpdateTeamMemberProfileDto
    {
        public string Title { get; set; } = string.Empty;
        public int YearsOfExperience { get; set; }
        public string? PhoneNumber { get; set; }
    }

    public class UpdateTeamMemberAvailabilityDto
    {
        public bool IsAvailable { get; set; }
    }

    public class ResetTeamMemberPasswordDto
    {
        public string NewPassword { get; set; } = string.Empty;
    }

    public class UpsertTeamMemberSkillDto
    {
        public int SkillId { get; set; }
        public int ProficiencyLevel { get; set; }
        public int YearsOfExperience { get; set; }
        public DateTime? AcquiredDate { get; set; }
        public bool IsEndorsed { get; set; }
        public int? EndorsementCount { get; set; }
    }

    public class TeamMemberDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int YearsOfExperience { get; set; }
        public string CV { get; set; } = string.Empty;
        public string? CvFileName { get; set; }
        public string? CvDownloadUrl { get; set; }
        public string ProfilePhoto { get; set; } = string.Empty;
        public string? ProfilePhotoUrl { get; set; }
        public string IntroVideo { get; set; } = string.Empty;
        public string? IntroVideoUrl { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public int? ResourceManagerId { get; set; }
        public string? ResourceManagerName { get; set; }
        public bool IsAvailable { get; set; }
        public bool IsActive { get; set; }
        public decimal? HourlySalary { get; set; }
        public List<TeamMemberSkillDto> SkillAssignments { get; set; } = new();
        public List<TeamMemberCertificateDto> Certificates { get; set; } = new();
        public List<TeamMemberExperienceDto> Experiences { get; set; } = new();
    }

    public class UpsertTeamMemberCertificateDto
    {
        public string Name { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public DateOnly IssuedDate { get; set; }
        public DateOnly? ExpiryDate { get; set; }
    }

    public class TeamMemberCertificateDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public DateOnly IssuedDate { get; set; }
        public DateOnly? ExpiryDate { get; set; }
    }

    public class UpsertTeamMemberExperienceDto
    {
        public string JobTitle { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public DateOnly StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class TeamMemberExperienceDto
    {
        public int Id { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public DateOnly StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string Description { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
    }

    public class TeamMemberSkillDto
    {
        public int Id { get; set; }
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public string SkillCategoryName { get; set; } = string.Empty;
        public int ProficiencyLevel { get; set; }
        public int YearsOfExperience { get; set; }
        public DateTime AcquiredDate { get; set; }
        public bool IsEndorsed { get; set; }
        public int? EndorsementCount { get; set; }
    }

    public class TeamStructureDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int YearsOfExperience { get; set; }
        public bool IsAvailable { get; set; }
        public List<TeamStructureDto> TeamMembers { get; set; } = new();
    }

    public class CvStorageResultDto
    {
        public int TeamMemberId { get; set; }
        public string CvPath { get; set; } = string.Empty;
    }
}
