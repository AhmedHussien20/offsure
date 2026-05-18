using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Domain.Entities.Enum
{
    public enum NotificationChannel
    {
        Web,
        Email,
        WhatsApp
    }

    public enum ServiceRequestStatus
    {
        Pending = 0,
        InProgress = 1,
        Completed = 2,
        Cancelled = 3
    }

    public enum ProjectStatus
    {
        Pending = 0,
        InProgress = 1,
        Completed = 2,
        OnHold = 3,
        Cancelled = 4
    }
}
