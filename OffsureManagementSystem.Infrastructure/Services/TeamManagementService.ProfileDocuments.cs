using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.TeamManagementDTOs;
using OffshoreManagementSystem.Domain.Entities;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public partial class TeamManagementService
    {
        public async Task<TeamMemberDto> StoreProfilePhotoForUserAsync(int userId, Stream content, string fileName)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            var storedName = await _profileStorageService.SaveProfilePhotoAsync(member.Id, fileName, content);

            member.ProfilePhoto = storedName;
            member.UpdatedAt = DateTime.UtcNow;
            _teamMemberRepo.SaveInclude(member, nameof(member.ProfilePhoto), nameof(member.UpdatedAt));
            await _teamMemberRepo.SaveChangesAsync();

            return await GetTeamMemberProfileAsync(userId);
        }

        public async Task<(Stream Stream, string FileName, string ContentType)?> OpenCvForUserAsync(int userId)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            if (string.IsNullOrWhiteSpace(member.CV))
                return null;

            return _cvStorageService.OpenCvRead(member.CV);
        }

        public async Task DeleteCvForUserAsync(int userId)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            member.CV = string.Empty;
            member.UpdatedAt = DateTime.UtcNow;
            _teamMemberRepo.SaveInclude(member, nameof(member.CV), nameof(member.UpdatedAt));
            await _teamMemberRepo.SaveChangesAsync();
        }

        public async Task<TeamMemberDto> AddCertificateForUserAsync(int userId, UpsertTeamMemberCertificateDto dto)
        {
            ValidateCertificateInput(dto);
            var member = await GetTeamMemberEntityForUserAsync(userId);

            await _certificateRepo.AddAsync(new TeamMemberCertificate
            {
                TeamMemberId = member.Id,
                Name = dto.Name.Trim(),
                Issuer = dto.Issuer.Trim(),
                IssuedDate = dto.IssuedDate,
                ExpiryDate = dto.ExpiryDate,
                CreatedAt = DateTime.UtcNow
            });
            await _certificateRepo.SaveChangesAsync();

            return await GetTeamMemberProfileAsync(userId);
        }

        public async Task<TeamMemberDto> UpdateCertificateForUserAsync(
            int userId,
            int certificateId,
            UpsertTeamMemberCertificateDto dto)
        {
            ValidateCertificateInput(dto);
            var member = await GetTeamMemberEntityForUserAsync(userId);
            var certificate = await GetOwnedCertificateAsync(member.Id, certificateId);

            certificate.Name = dto.Name.Trim();
            certificate.Issuer = dto.Issuer.Trim();
            certificate.IssuedDate = dto.IssuedDate;
            certificate.ExpiryDate = dto.ExpiryDate;
            certificate.UpdatedAt = DateTime.UtcNow;

            _certificateRepo.SaveInclude(
                certificate,
                nameof(certificate.Name),
                nameof(certificate.Issuer),
                nameof(certificate.IssuedDate),
                nameof(certificate.ExpiryDate),
                nameof(certificate.UpdatedAt));
            await _certificateRepo.SaveChangesAsync();

            return await GetTeamMemberProfileAsync(userId);
        }

        public async Task<TeamMemberDto> DeleteCertificateForUserAsync(int userId, int certificateId)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            var certificate = await GetOwnedCertificateAsync(member.Id, certificateId);

            certificate.IsDeleted = true;
            certificate.DeletedAt = DateTime.UtcNow;
            certificate.UpdatedAt = DateTime.UtcNow;
            _certificateRepo.SaveInclude(
                certificate,
                nameof(certificate.IsDeleted),
                nameof(certificate.DeletedAt),
                nameof(certificate.UpdatedAt));
            await _certificateRepo.SaveChangesAsync();

            return await GetTeamMemberProfileAsync(userId);
        }

        public async Task<TeamMemberDto> AddExperienceForUserAsync(int userId, UpsertTeamMemberExperienceDto dto)
        {
            ValidateExperienceInput(dto);
            var member = await GetTeamMemberEntityForUserAsync(userId);
            var nextOrder = await _experienceRepo
                .Query()
                .Where(e => e.TeamMemberId == member.Id && !e.IsDeleted)
                .Select(e => (int?)e.DisplayOrder)
                .MaxAsync() ?? 0;

            await _experienceRepo.AddAsync(new TeamMemberExperience
            {
                TeamMemberId = member.Id,
                JobTitle = dto.JobTitle.Trim(),
                Company = dto.Company.Trim(),
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Description = dto.Description?.Trim() ?? string.Empty,
                DisplayOrder = nextOrder + 1,
                CreatedAt = DateTime.UtcNow
            });
            await _experienceRepo.SaveChangesAsync();

            return await GetTeamMemberProfileAsync(userId);
        }

        public async Task<TeamMemberDto> UpdateExperienceForUserAsync(
            int userId,
            int experienceId,
            UpsertTeamMemberExperienceDto dto)
        {
            ValidateExperienceInput(dto);
            var member = await GetTeamMemberEntityForUserAsync(userId);
            var experience = await GetOwnedExperienceAsync(member.Id, experienceId);

            experience.JobTitle = dto.JobTitle.Trim();
            experience.Company = dto.Company.Trim();
            experience.StartDate = dto.StartDate;
            experience.EndDate = dto.EndDate;
            experience.Description = dto.Description?.Trim() ?? string.Empty;
            experience.UpdatedAt = DateTime.UtcNow;

            _experienceRepo.SaveInclude(
                experience,
                nameof(experience.JobTitle),
                nameof(experience.Company),
                nameof(experience.StartDate),
                nameof(experience.EndDate),
                nameof(experience.Description),
                nameof(experience.UpdatedAt));
            await _experienceRepo.SaveChangesAsync();

            return await GetTeamMemberProfileAsync(userId);
        }

        public async Task<TeamMemberDto> DeleteExperienceForUserAsync(int userId, int experienceId)
        {
            var member = await GetTeamMemberEntityForUserAsync(userId);
            var experience = await GetOwnedExperienceAsync(member.Id, experienceId);

            experience.IsDeleted = true;
            experience.DeletedAt = DateTime.UtcNow;
            experience.UpdatedAt = DateTime.UtcNow;
            _experienceRepo.SaveInclude(
                experience,
                nameof(experience.IsDeleted),
                nameof(experience.DeletedAt),
                nameof(experience.UpdatedAt));
            await _experienceRepo.SaveChangesAsync();

            return await GetTeamMemberProfileAsync(userId);
        }

        private async Task<TeamMemberCertificate> GetOwnedCertificateAsync(int teamMemberId, int certificateId)
        {
            var certificate = await _certificateRepo
                .Query()
                .FirstOrDefaultAsync(c => c.Id == certificateId && c.TeamMemberId == teamMemberId && !c.IsDeleted);

            if (certificate is null)
                throw new AppException("Certificate not found.", 404);

            return certificate;
        }

        private async Task<TeamMemberExperience> GetOwnedExperienceAsync(int teamMemberId, int experienceId)
        {
            var experience = await _experienceRepo
                .Query()
                .FirstOrDefaultAsync(e => e.Id == experienceId && e.TeamMemberId == teamMemberId && !e.IsDeleted);

            if (experience is null)
                throw new AppException("Experience entry not found.", 404);

            return experience;
        }

        private static void ValidateCertificateInput(UpsertTeamMemberCertificateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Issuer))
                throw new AppException("Certificate name and issuer are required.", 400);

            if (dto.ExpiryDate.HasValue && dto.ExpiryDate.Value < dto.IssuedDate)
                throw new AppException("Expiry date cannot be before issued date.", 400);
        }

        private static void ValidateExperienceInput(UpsertTeamMemberExperienceDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.JobTitle) || string.IsNullOrWhiteSpace(dto.Company))
                throw new AppException("Job title and company are required.", 400);

            if (dto.EndDate.HasValue && dto.EndDate.Value < dto.StartDate)
                throw new AppException("End date cannot be before start date.", 400);
        }
    }
}
