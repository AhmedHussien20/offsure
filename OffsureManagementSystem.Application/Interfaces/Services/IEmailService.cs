namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(
            string to,
            string subject,
            string body,
            string? replyToEmail = null,
            string? replyToName = null);
    }
}
