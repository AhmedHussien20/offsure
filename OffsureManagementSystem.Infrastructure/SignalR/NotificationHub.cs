    using Microsoft.AspNetCore.SignalR;
    using System.Collections.Concurrent;

namespace OffsureManagementSystem.Infrastructure.SignalR
{

    public class NotificationHub : Hub
    {

        public static readonly ConcurrentDictionary<int, List<string>> _onlineUsers
            = new ConcurrentDictionary<int, List<string>>();

        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            var userIdString = httpContext.Request.Query["userId"];

            if (int.TryParse(userIdString, out int userId))
            {
                var connectionId = Context.ConnectionId;

                _onlineUsers.AddOrUpdate(userId,
                    new List<string> { connectionId },
                    (key, existing) =>
                    {
                        existing.Add(connectionId);
                        return existing;
                    });

                Console.WriteLine($"  User {userId} connected with ConnectionId: {connectionId}");
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            foreach (var kvp in _onlineUsers)
            {
                if (kvp.Value.Contains(Context.ConnectionId))
                {
                    kvp.Value.Remove(Context.ConnectionId);

                    if (!kvp.Value.Any())
                        _onlineUsers.TryRemove(kvp.Key, out _);

                    Console.WriteLine($"  User {kvp.Key} disconnected");
                    break;
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        public static bool IsUserOnline(int userId)
        {
            return _onlineUsers.ContainsKey(userId);
        }

        public async Task SendToUser(int userId, string message, int? taskId)
        {
            if (_onlineUsers.TryGetValue(userId, out var connections))
            {
                foreach (var conn in connections)
                {
                    await Clients.Client(conn).SendAsync("ReceiveNotification",new { message, taskId});
                }
            }
        }
    }
}

