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
        PrimaryAccepted = 1,
        Completed = 2,
        Cancelled = 3,
        AcceptedWithProject = 4,
    }

    public enum ProjectStatus
    {
        Pending = 0,
        InProgress = 1,
        Completed = 2,
        OnHold = 3,
        Cancelled = 4
    }

    /// <summary>How project budget is defined: fixed total or rate × expected hours.</summary>
    public enum ProjectBudgetType
    {
        Total = 0,
        Hourly = 1
    }

    public enum MilestoneStatus
    {
        NotStarted = 1,
        InProgress = 2,
        Completed = 3
    }

    /// <summary>Application user roles (matches seeded <see cref="Role.Name"/> values).</summary>
    public enum UserRole
    {
        Administrator = 1,
        Client = 2,
        TeamMember = 3,
        ResourceManager = 4,
        Sales = 5
    }

    /// <summary>
    /// Client portal account type within an organization.
    /// Both still use ASP.NET role <see cref="UserRole.Client"/>.
    /// </summary>
    public enum ClientAccountRole
    {
        Owner = 1,
        Member = 2
    }

    public enum CommissionType
    {
        Fixed = 0,
        Percentage = 1
    }

    public enum PaymentStatus
    {
        Pending = 0,
        Completed = 1
    }
}
