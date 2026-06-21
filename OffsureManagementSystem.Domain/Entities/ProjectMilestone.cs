namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;
    using OffsureManagementSystem.Domain.Entities.Enum;

    public class ProjectMilestone : BaseEntity
    {
        public int ProjectId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Order { get; set; }
        public decimal PaymentPercentage { get; set; }
        public decimal PaymentAmount { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public MilestoneStatus Status { get; set; } = MilestoneStatus.NotStarted;

        public virtual Project Project { get; set; }
    }
}
