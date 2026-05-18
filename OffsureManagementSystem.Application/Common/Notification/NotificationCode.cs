using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TaskMangment.Application.Common.Notification
{
    public class NotificationCode
    {
        public const string TaskAssignedNotification = "TASK_ASSIGNED_NOTIFICATION";//
        public const string TaskUnAssignedNotification = "TASK_UNASSIGNED_NOTIFICATION";//
        public const string NotFound = "NOT_FOUND";
        public const string TaskExtensionRequestNotification = "TASK_EXTENSION_REQUEST_NOTIFICATION";//
        public const string TaskCloseRequestNotification = "TASK_CLOSE_REQUEST_NOTIFICATION";//
        public const string TaskCommentNotification = "TASK_COMMENT_NOTIFICATION";//
        public const string TaskWarningNotification = "TASK_WARNING_NOTIFICATION";//
        public const string TaskPenaltyNotification = "TASK_PENALTY_NOTIFICATION";//
        public const string CloseApprove = "CLOSEAPPROVED";//
        public const string ExtendApprove = "EXTENDAPPROVED";//
        public const string TaskAchievement = "TASKACHIEVEMENT";//
        public const string LeaveRequestCreated = "LEAVEREQUESTCREATED";//
        public const string LeaveApprovedNotification = "LEAVE_APPROVED_NOTIFICATION";//
        public const string LeaveRejectedNotification = "LEAVE_REJECTED_NOTIFICATION";//
    }
}
