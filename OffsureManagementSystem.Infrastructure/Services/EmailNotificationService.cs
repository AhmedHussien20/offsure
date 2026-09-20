using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using OffsureManagementSystem.Application.Common;
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
            var safeName = WebUtility.HtmlEncode(firstName.Trim());
            var brand = WebUtility.HtmlEncode(BrandingConstants.ServiceProviderName);

            var content =
                EmailTemplateBuilder.P($"Dear {safeName},") +
                EmailTemplateBuilder.P(
                    $"Thank you for registering with {brand}. " +
                    "Please verify your email address to activate your client portal account.") +
                EmailTemplateBuilder.Note("This link expires in 24 hours.") +
                EmailTemplateBuilder.Note(
                    "If you did not create this account, you may disregard this message.");

            var body = EmailTemplateBuilder.Wrap(
                title: "Email verification",
                contentHtml: content,
                ctaLabel: "Verify email address",
                ctaUrl: verificationLink);

            await _emailService.SendEmailAsync(
                to,
                $"Verify your {BrandingConstants.ClientPortalName} account",
                body);
        }

        public async Task SendPasswordResetEmailAsync(string to, string resetToken)
        {
            var resetLink = $"{_frontendBaseUrl}/auth/reset-password?token={resetToken}";

            var content =
                EmailTemplateBuilder.P("Dear Valued Client,") +
                EmailTemplateBuilder.P(
                    "We received a request to reset the password associated with your account. " +
                    "Please use the link below to set a new password.") +
                EmailTemplateBuilder.Note("This link expires in 30 minutes.") +
                EmailTemplateBuilder.Note(
                    "If you did not request a password reset, no further action is required.");

            var body = EmailTemplateBuilder.Wrap(
                title: "Password reset",
                contentHtml: content,
                ctaLabel: "Reset password",
                ctaUrl: resetLink);

            await _emailService.SendEmailAsync(to, "Reset Your Password", body);
        }

        public async Task SendRequestConfirmationAsync(ServiceRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.ClientEmail))
                return;

            var safeName = WebUtility.HtmlEncode(request.ClientName ?? string.Empty);

            var content =
                EmailTemplateBuilder.P($"Dear {safeName},") +
                EmailTemplateBuilder.P(
                    "This is to confirm that your service request has been accepted and will be handled by our team.") +
                EmailTemplateBuilder.Line("Request", WebUtility.HtmlEncode(request.Title ?? string.Empty)) +
                EmailTemplateBuilder.Line("Service", WebUtility.HtmlEncode(request.ServiceName ?? string.Empty)) +
                EmailTemplateBuilder.Line("Status", WebUtility.HtmlEncode(request.Status.ToString())) +
                EmailTemplateBuilder.P("We will notify you of any further updates.");

            var body = EmailTemplateBuilder.Wrap(
                title: "Service request accepted",
                contentHtml: content);

            await _emailService.SendEmailAsync(
                request.ClientEmail,
                $"Service request accepted: {request.Title}",
                body);
        }

        public async Task SendStatusUpdateAsync(ServiceRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.ClientEmail))
                return;

            var safeName = WebUtility.HtmlEncode(request.ClientName ?? string.Empty);

            var content =
                EmailTemplateBuilder.P($"Dear {safeName},") +
                EmailTemplateBuilder.P(
                    "Please be advised that the status of your service request has been updated.") +
                EmailTemplateBuilder.Line("Request", WebUtility.HtmlEncode(request.Title ?? string.Empty)) +
                EmailTemplateBuilder.Line("Service", WebUtility.HtmlEncode(request.ServiceName ?? string.Empty)) +
                EmailTemplateBuilder.Line("Status", WebUtility.HtmlEncode(request.Status.ToString()));

            var body = EmailTemplateBuilder.Wrap(
                title: "Service request update",
                contentHtml: content);

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

            var safeName = WebUtility.HtmlEncode(clientName ?? string.Empty);
            var safeProject = WebUtility.HtmlEncode(projectName ?? string.Empty);

            var content =
                EmailTemplateBuilder.P($"Dear {safeName},") +
                EmailTemplateBuilder.P(
                    $"We are pleased to inform you that the project <strong>{safeProject}</strong> has been completed.") +
                EmailTemplateBuilder.P(
                    "Should you require any further assistance, please do not hesitate to contact us.");

            var body = EmailTemplateBuilder.Wrap(
                title: "Project completion notice",
                contentHtml: content);

            await _emailService.SendEmailAsync(
                clientEmail,
                $"Project completed: {projectName}",
                body);
        }

        public async Task NotifyAdminNewRequestAsync(ServiceRequestDto request)
        {
            var adminEmails = await GetActiveAdministratorEmailsAsync();
            var clientEmail = request.ClientEmail?.Trim() ?? string.Empty;
            var clientName = string.IsNullOrWhiteSpace(request.ClientName)
                ? "Valued Client"
                : request.ClientName.Trim();
            var requestTitle = request.Title?.Trim() ?? "your request";

            var content =
                EmailTemplateBuilder.P(
                    "A new service request has been submitted and requires your attention.") +
                EmailTemplateBuilder.Line("Client", WebUtility.HtmlEncode(request.ClientName ?? string.Empty)) +
                EmailTemplateBuilder.Line("Service", WebUtility.HtmlEncode(request.ServiceName ?? string.Empty)) +
                EmailTemplateBuilder.Line("Title", WebUtility.HtmlEncode(request.Title ?? string.Empty));

            string? ctaLabel = null;
            string? ctaUrl = null;
            if (!string.IsNullOrWhiteSpace(clientEmail))
            {
                content += EmailTemplateBuilder.Note(
                    "To contact the client, use the link below. It opens a new email.");

                ctaLabel = "Email client (new message)";
                ctaUrl = EmailTemplateBuilder.BuildMailtoUrl(
                    clientEmail,
                    $"Regarding your request: {requestTitle}",
                    $"Dear {clientName},\n\nThank you for your service request. We are reviewing the details and will follow up with you shortly.\n\nKind regards,\n{BrandingConstants.ServiceProviderName}");
            }

            var body = EmailTemplateBuilder.Wrap(
                title: "New service request",
                contentHtml: content,
                ctaLabel: ctaLabel,
                ctaUrl: ctaUrl);

            await SendToRecipientsAsync(
                adminEmails,
                $"New service request: {request.Title}",
                body,
                replyToEmail: string.IsNullOrWhiteSpace(clientEmail) ? null : clientEmail,
                replyToName: string.IsNullOrWhiteSpace(request.ClientName) ? null : request.ClientName);
        }

        public async Task NotifyAdminsOfContactMessageAsync(ContactMessageDto message)
        {
            var adminEmails = await GetActiveAdministratorEmailsAsync();
            var visitorName = message.Name.Trim();
            var visitorEmail = message.Email.Trim();
            var safeName = WebUtility.HtmlEncode(visitorName);
            var safeEmail = WebUtility.HtmlEncode(visitorEmail);
            var safeSubject = WebUtility.HtmlEncode(message.Subject?.Trim() ?? string.Empty);
            var safeCategory = WebUtility.HtmlEncode(message.ServiceCategory?.Trim() ?? string.Empty);
            var safeMessage = WebUtility.HtmlEncode(message.Message.Trim())
                .Replace("\n", "<br/>", StringComparison.Ordinal);

            var emailSubject = string.IsNullOrWhiteSpace(message.Subject)
                ? $"Landing page contact from {visitorName}"
                : message.Subject.Trim();

            var content =
                EmailTemplateBuilder.P(
                    "A contact message was received from the landing page.") +
                EmailTemplateBuilder.Line("Name", safeName) +
                EmailTemplateBuilder.Line(
                    "Email",
                    $@"<a href=""mailto:{safeEmail}"" style=""color:#0f4c81;"">{safeEmail}</a>");

            if (!string.IsNullOrWhiteSpace(message.ServiceCategory))
                content += EmailTemplateBuilder.Line("Category", safeCategory);

            if (!string.IsNullOrWhiteSpace(message.Subject))
                content += EmailTemplateBuilder.Line("Subject", safeSubject);

            content +=
                EmailTemplateBuilder.P("Message:") +
                EmailTemplateBuilder.P(safeMessage);

            content += EmailTemplateBuilder.Note(
                "To contact the client, use the link below. It opens a new email.");

            var mailtoSubject = string.IsNullOrWhiteSpace(message.Subject)
                ? $"Regarding your enquiry — {BrandingConstants.ServiceProviderName}"
                : $"Re: {message.Subject.Trim()}";

            var mailtoBody =
                $"Dear {visitorName},\n\nThank you for contacting {BrandingConstants.ServiceProviderName}. " +
                "We have received your message and will get back to you shortly.\n\nKind regards,\n" +
                BrandingConstants.ServiceProviderName;

            var body = EmailTemplateBuilder.Wrap(
                title: "Contact message",
                contentHtml: content,
                ctaLabel: "Email sender (new message)",
                ctaUrl: EmailTemplateBuilder.BuildMailtoUrl(visitorEmail, mailtoSubject, mailtoBody));

            await SendToRecipientsAsync(
                adminEmails,
                emailSubject,
                body,
                replyToEmail: visitorEmail,
                replyToName: visitorName);
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

        private async Task SendToRecipientsAsync(
            IReadOnlyList<string> recipients,
            string subject,
            string body,
            string? replyToEmail = null,
            string? replyToName = null)
        {
            if (recipients.Count == 0)
            {
                throw new InvalidOperationException("No administrator email recipients are configured.");
            }

            foreach (var recipient in recipients)
            {
                await _emailService.SendEmailAsync(
                    recipient,
                    subject,
                    body,
                    replyToEmail,
                    replyToName);
            }
        }
    }
}
