using OffsureManagementSystem.Application.DTOs.ProjectInvoiceDTOs;
using OffsureManagementSystem.Domain.Entities.Enum;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IProjectInvoiceService
    {
        Task<List<ProjectInvoiceDto>> GetInvoicesForProjectAsync(int userId, string role, int projectId);
        Task<ProjectInvoiceDto> UpsertMilestoneInvoiceAsync(
            int projectId,
            int milestoneId,
            IReadOnlyList<(Stream Content, string FileName)> invoiceFiles,
            Stream? purchaseOrderContent,
            string? purchaseOrderFileName,
            string? notes);
        Task<ProjectInvoiceDto> UpsertMonthlyInvoiceAsync(
            int projectId,
            int billingYear,
            int billingMonth,
            IReadOnlyList<(Stream Content, string FileName)> invoiceFiles,
            Stream? purchaseOrderContent,
            string? purchaseOrderFileName,
            string? notes);
        Task<ProjectInvoiceDto> UpsertWholeInvoiceAsync(
            int projectId,
            IReadOnlyList<(Stream Content, string FileName)> invoiceFiles,
            Stream? purchaseOrderContent,
            string? purchaseOrderFileName,
            string? notes);
        Task<ProjectInvoiceDto> AddDocumentsAsync(
            int projectId,
            int invoiceId,
            IReadOnlyList<(Stream Content, string FileName)> invoiceFiles);
        Task DeleteDocumentAsync(int projectId, int invoiceId, int documentId);
        Task<ProjectInvoiceDto> AttachPurchaseOrderAsync(
            int projectId,
            int invoiceId,
            Stream purchaseOrderContent,
            string purchaseOrderFileName);
        Task<ProjectInvoiceDto> UpdatePaymentStatusAsync(int projectId, int invoiceId, PaymentStatus status);
        Task DeleteInvoiceAsync(int projectId, int invoiceId);
    }
}
