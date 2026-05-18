using Microsoft.AspNetCore.SignalR;
using OffsureManagementSystem.Infrastructure.SignalR;
using OffsureManagementSystem.Application.Interfaces.Services;

namespace TaskMangment.Infrastructure.Services
{
    public class NotificationSender : INotificationSender
    {
        private readonly IHubContext<NotificationHub> _hub; 

        public NotificationSender(IHubContext<NotificationHub> hub  )
        {
            _hub = hub; 
        }

        public async Task SendWebAsync(int userId, string message)
        {
            if (!NotificationHub._onlineUsers.TryGetValue(userId, out var connections))
                return;

            foreach (var connectionId in connections)
            {
                if (string.IsNullOrWhiteSpace(connectionId))
                    continue;
                await _hub.Clients.Client(connectionId).SendAsync("ReceiveNotification", new { message });
            }
        } 

    }

}
