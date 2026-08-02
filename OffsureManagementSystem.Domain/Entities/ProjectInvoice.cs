namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;
    using OffsureManagementSystem.Domain.Entities.Enum;

    public class ProjectInvoice : BaseEntity
    {
        public int ProjectId { get; set; }
        /// <summary>Set for milestone-phase invoices; null otherwise.</summary>
        public int? MilestoneId { get; set; }
        /// <summary>Set for hourly monthly invoices; null otherwise.</summary>
        public int? BillingYear { get; set; }
        /// <summary>1–12 for hourly monthly invoices; null otherwise.</summary>
        public int? BillingMonth { get; set; }
        public string InvoiceFileName { get; set; } = string.Empty;
        public string InvoiceFileUrl { get; set; } = string.Empty;
        public string? PurchaseOrderFileName { get; set; }
        public string? PurchaseOrderFileUrl { get; set; }
        public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
        public decimal? Amount { get; set; }
        public string? Notes { get; set; }

        public virtual Project Project { get; set; }
        public virtual ProjectMilestone? Milestone { get; set; }
        public virtual ICollection<ProjectInvoiceDocument> Documents { get; set; } = new List<ProjectInvoiceDocument>();
    }
}
