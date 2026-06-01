using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using OffsureManagementSystem.Application.DTOs.ContactDTOs;
using OffsureManagementSystem.Application.DTOs.ServiceManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using System.Net;
using User = OffshoreManagementSystem.Domain.Entities.User;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class EmailNotificationService : IEmailNotificationService
    {
        private readonly IEmailService _emailService;
        private readonly IRepository<User> _userRepo;
        private readonly string _frontendBaseUrl;
        private readonly string? _fallbackAdminEmail;

        public EmailNotificationService(
            IEmailService emailService,
            IRepository<User> userRepo,
            IConfiguration configuration,
            IOptions<EmailSettings> emailSettings)
        {
            _emailService = emailService;
            _userRepo = userRepo;
            _frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:4200";
            _fallbackAdminEmail = emailSettings.Value.To;
        }

        public async Task SendVerificationEmailAsync(
            string to,
            string firstName,
            int userId,
            string verificationToken)
        {
            var verificationLink = $"{_frontendBaseUrl}/auth/verify-email?userId={userId}&token={verificationToken}";
            var body = $@"
                <h2>Welcome {firstName}</h2>
                <p>Please verify your email:</p>
                <a href='{verificationLink}'>Verify Email</a>
                <p>This link expires in 24 hours.</p>";

            await _emailService.SendEmailAsync(to, "Verify Your Email", body);
        }

        public async Task SendPasswordResetEmailAsync(string to, string resetToken)
        {
            var resetLink = $"{_frontendBaseUrl}/auth/reset-password?token={resetToken}";
            var body = $@"
                <h2>Password Reset Request</h2>
                <p>You requested to reset your password.</p>
                <a href='{resetLink}'>Reset Password</a>
                <p>This link expires in 30 minutes.</p>";

            await _emailService.SendEmailAsync(to, "Reset Your Password", body);
        }

        public async Task SendRequestConfirmationAsync(ServiceRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.ClientEmail))
                return;

            var body = $@"
                <p>Hello {request.ClientName},</p>
                <p>Your service request <strong>{request.Title}</strong> has been accepted.</p>
                <p>Service: {request.ServiceName}</p>";

            await _emailService.SendEmailAsync(
                request.ClientEmail,
                $"Service request accepted: {request.Title}",
                body);
        }

        public async Task SendStatusUpdateAsync(ServiceRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.ClientEmail))
                return;

            var body = $@"
                <p>Hello {request.ClientName},</p>
                <p>Your service request <strong>{request.Title}</strong> is now <strong>{request.Status}</strong>.</p>
                <p>Service: {request.ServiceName}</p>";

            await _emailService.SendEmailAsync(
                request.ClientEmail,
                $"Service request status updated: {request.Title}",
                body);
        }

        public async Task SendProjectCompletionAsync(
            string clientEmail,
            string clientName,
            string projectName)
        {
            if (string.IsNullOrWhiteSpace(clientEmail))
                return;

            var body = $@"
                <p>Hello {clientName},</p>
                <p>Your project <strong>{projectName}</strong> has been completed.</p>";

            await _emailService.SendEmailAsync(
                clientEmail,
                $"Project completed: {projectName}",
                body);
        }

        public async Task NotifyAdminNewRequestAsync(ServiceRequestDto request)
        {
            var adminEmails = await GetActiveAdministratorEmailsAsync();
            var body = $@"
                <p>A new service request was submitted.</p>
                <p><strong>Client:</strong> {WebUtility.HtmlEncode(request.ClientName)}</p>
                <p><strong>Service:</strong> {WebUtility.HtmlEncode(request.ServiceName)}</p>
                <p><strong>Title:</strong> {WebUtility.HtmlEncode(request.Title)}</p>
                <p><strong>Status:</strong> {WebUtility.HtmlEncode(request.Status.ToString())}</p>";

            await SendToRecipientsAsync(
                adminEmails,
                $"New service request: {request.Title}",
                body);
        }

        public async Task NotifyAdminsOfContactMessageAsync(ContactMessageDto message)
        {
            var adminEmails = await GetActiveAdministratorEmailsAsync();
            var safeName = WebUtility.HtmlEncode(message.Name.Trim());
            var safeEmail = WebUtility.HtmlEncode(message.Email.Trim());
            var safeSubject = WebUtility.HtmlEncode(message.Subject?.Trim() ?? string.Empty);
            var safeCategory = WebUtility.HtmlEncode(message.ServiceCategory?.Trim() ?? string.Empty);
            var safeMessage = WebUtility.HtmlEncode(message.Message.Trim()).Replace("\n", "<br/>", StringComparison.Ordinal);

            var emailSubject = string.IsNullOrWhiteSpace(message.Subject)
                ? $"Landing page contact from {message.Name.Trim()}"
                : message.Subject.Trim();

            var body = $@"
                <h2>New landing page contact message</h2>
                <p><strong>Name:</strong> {safeName}</p>
                <p><strong>Email:</strong> <a href=""mailto:{safeEmail}"">{safeEmail}</a></p>
                {(string.IsNullOrWhiteSpace(message.ServiceCategory) ? string.Empty : $"<p><strong>Service category:</strong> {safeCategory}</p>")}
                {(string.IsNullOrWhiteSpace(message.Subject) ? string.Empty : $"<p><strong>Subject:</strong> {safeSubject}</p>")}
                <p><strong>Message:</strong></p>
                <p>{safeMessage}</p>";

            await SendToRecipientsAsync(adminEmails, emailSubject, body);
        }

        private async Task<List<string>> GetActiveAdministratorEmailsAsync()
        {
            var adminEmails = await _userRepo
                .Query()
                .Include(u => u.Role)
                .Where(u =>
                    u.IsActive
                    && u.Role.IsActive
                    && u.Role.Name == "Administrator"
                    && !string.IsNullOrWhiteSpace(u.Email))
                .Select(u => u.Email!)
                .Distinct()
                .ToListAsync();

            if (adminEmails.Count == 0 && !string.IsNullOrWhiteSpace(_fallbackAdminEmail))
            {
                adminEmails.Add(_fallbackAdminEmail);
            }

            return adminEmails;
        }

        private async Task SendToRecipientsAsync(IReadOnlyList<string> recipients, string subject, string body)
        {
            if (recipients.Count == 0)
            {
                throw new InvalidOperationException("No administrator email recipients are configured.");
            }

            foreach (var recipient in recipients)
            {
                await _emailService.SendEmailAsync(recipient, subject, body);
            }
        }
    }
}
