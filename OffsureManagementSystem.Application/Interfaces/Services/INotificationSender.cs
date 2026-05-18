using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface INotificationSender
    {
        Task SendWebAsync(int userId, string message);
       
    }

}
