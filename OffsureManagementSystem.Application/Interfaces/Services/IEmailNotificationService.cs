using OffsureManagementSystem.Application.DTOs.ServiceManagementDTOs;
using OffsureManagementSystem.Domain.Entities.Enum;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IEmailNotificationService
    {
        Task SendVerificationEmailAsync(string to, string firstName, int userId, string verificationToken);
        Task SendPasswordResetEmailAsync(string to, string resetToken);
        Task SendRequestConfirmationAsync(ServiceRequestDto request);
        Task SendStatusUpdateAsync(ServiceRequestDto request);
        Task SendProjectCompletionAsync(string clientEmail, string clientName, string projectName);
        Task NotifyAdminNewRequestAsync(ServiceRequestDto request);
    }
}
