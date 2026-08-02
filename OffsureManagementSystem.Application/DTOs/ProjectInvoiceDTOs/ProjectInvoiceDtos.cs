using OffsureManagementSystem.Domain.Entities.Enum;

namespace OffsureManagementSystem.Application.DTOs.ProjectInvoiceDTOs
{
    public class ProjectInvoiceDocumentDto
    {
        public int Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
    }

    public class ProjectInvoiceDto
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public int? MilestoneId { get; set; }
        public string? MilestoneName { get; set; }
        public int? BillingYear { get; set; }
        public int? BillingMonth { get; set; }
        /// <summary>Primary/legacy invoice file name (first document).</summary>
        public string InvoiceFileName { get; set; } = string.Empty;
        /// <summary>Primary/legacy invoice file url (first document).</summary>
        public string InvoiceFileUrl { get; set; } = string.Empty;
        public List<ProjectInvoiceDocumentDto> Documents { get; set; } = new();
        public string? PurchaseOrderFileName { get; set; }
        public string? PurchaseOrderFileUrl { get; set; }
        public PaymentStatus PaymentStatus { get; set; }
        public decimal? Amount { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateProjectInvoiceStatusDto
    {
        public PaymentStatus Status { get; set; }
    }
}
