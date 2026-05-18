using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Infrastructure.SignalR;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class OnlineUserService : IOnlineUserService
    {
        public bool IsUserOnline(int userId)
        {
            return NotificationHub._onlineUsers.ContainsKey(userId);
        }
    }

}
