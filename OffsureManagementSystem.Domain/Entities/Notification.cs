using OffshoreManagementSystem.Domain.BaseEntity;
using OffsureManagementSystem.Domain.Entities.Enum;


namespace OffsureManagementSystem.Domain.Entities
{

    public class Notification : BaseEntity
    {
        public int UserId { get; set; }
        public string Message { get; set; }
        public NotificationChannel Channel { get; set; }
        public bool IsRead { get; set; } = false;  
        public int ReferenceId { get; set; }
        public int? TaskId { get; set; }
    }
}
