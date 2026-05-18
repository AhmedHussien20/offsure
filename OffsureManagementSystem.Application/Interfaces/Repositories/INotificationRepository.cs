
using OffsureManagementSystem.Domain.Entities;

namespace OffsureManagementSystem.Application.Interfaces.IRepository
{
    public interface INotificationRepository
    {
        Task AddAsync(Notification notification);
        Task<List<Notification>> GetUnreadAsync(int userId);
        Task MarkAsReadAsync(int notificationId);
        Task MarkAllAsReadAsync(int userId);
    }

}
