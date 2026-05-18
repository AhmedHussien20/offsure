


using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities;

public class NotificationService : INotificationService
{
    private readonly INotificationSender _notificationSender;
    private readonly IOnlineUserService _onlineUserService;
    private readonly INotificationRepository _repo;



    public NotificationService(INotificationSender notificationSender, IOnlineUserService onlineUserService, INotificationRepository repo)

    {
        _notificationSender = notificationSender;
        _onlineUserService = onlineUserService;
        _repo = repo;

    }

    public async Task SendAsync(int userId, string messageKey, bool sendEmail, bool sendWhatsApp, int referenceId)
    {
        var message = messageKey;

        bool isOnline = _onlineUserService.IsUserOnline(userId);

        var notification = new Notification
        {
            UserId = userId,
            Message = message,
            ReferenceId = referenceId,
            IsRead = isOnline,
        };

        await _repo.AddAsync(notification);

        if (isOnline)
        {
            await _notificationSender.SendWebAsync(userId, message);
            return;
        }
        if (sendWhatsApp)
        {
          
        }
    }

    public Task<List<Notification>> GetUnreadAsync(int userId)
        => _repo.GetUnreadAsync(userId);

    public Task MarkAsReadAsync(int notificationId)
        => _repo.MarkAsReadAsync(notificationId);

    public Task MarkAllAsReadAsync(int userId)
        => _repo.MarkAllAsReadAsync(userId);


}


