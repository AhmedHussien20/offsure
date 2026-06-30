namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;
    using OffsureManagementSystem.Domain.Entities.Enum;

    public class Project : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public int? ServiceRequestId { get; set; }
        public ProjectStatus Status { get; set; } = ProjectStatus.Pending;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? TargetEndDate { get; set; }
        public decimal? Budget { get; set; }
        public ProjectBudgetType BudgetType { get; set; } = ProjectBudgetType.Total;
        /// <summary>When <see cref="BudgetType"/> is Hourly, the billing rate per hour used for assignments.</summary>
        public decimal? HourlyRate { get; set; }
        /// <summary>When <see cref="BudgetType"/> is Hourly, minimum expected hours for the project.</summary>
        public int? ExpectedHours { get; set; }
        public int? Progress { get; set; } // 0-100
        public bool UsesMilestones { get; set; }
        public int? MilestoneCount { get; set; }
        /// <summary>When true, team is assigned via required skill tracks; when false, RMs pick from their full roster.</summary>
        public bool AssignTeamBySkill { get; set; } = true;
        public int? SalesId { get; set; }
        public CommissionType? CommissionType { get; set; }
        public decimal? CommissionValue { get; set; }

        // Navigation Properties
        public virtual ServiceRequest ServiceRequest { get; set; }
        public virtual User? SalesUser { get; set; }
        public virtual ICollection<ProjectAssignment> ProjectAssignments { get; set; } = new List<ProjectAssignment>();
        public virtual ICollection<ProjectSkill> ProjectSkills { get; set; } = new List<ProjectSkill>();
        public virtual ICollection<ProjectResourceManager> ProjectResourceManagers { get; set; } = new List<ProjectResourceManager>();
        public virtual ICollection<ProjectMilestone> ProjectMilestones { get; set; } = new List<ProjectMilestone>();
    }
}
