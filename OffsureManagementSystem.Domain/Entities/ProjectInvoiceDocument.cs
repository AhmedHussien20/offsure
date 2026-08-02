namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class ProjectInvoiceDocument : BaseEntity
    {
        public int ProjectInvoiceId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }

        public virtual ProjectInvoice ProjectInvoice { get; set; } = null!;
    }
}
