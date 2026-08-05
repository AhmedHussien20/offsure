using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.ProjectInvoiceDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities.Enum;
using Client = OffshoreManagementSystem.Domain.Entities.Client;
using Project = OffshoreManagementSystem.Domain.Entities.Project;
using ProjectInvoice = OffshoreManagementSystem.Domain.Entities.ProjectInvoice;
using ProjectInvoiceDocument = OffshoreManagementSystem.Domain.Entities.ProjectInvoiceDocument;
using ProjectMilestone = OffshoreManagementSystem.Domain.Entities.ProjectMilestone;
using ProjectResourceManager = OffshoreManagementSystem.Domain.Entities.ProjectResourceManager;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ProjectInvoiceService : IProjectInvoiceService
    {
        private readonly IRepository<Project> _projectRepo;
        private readonly IRepository<ProjectInvoice> _invoiceRepo;
        private readonly IRepository<ProjectInvoiceDocument> _documentRepo;
        private readonly IRepository<ProjectMilestone> _milestoneRepo;
        private readonly IRepository<ProjectResourceManager> _projectResourceManagerRepo;
        private readonly IRepository<Client> _clientRepo;
        private readonly IProjectInvoiceStorageService _storage;
        private readonly IClientAccessService _clientAccess;

        public ProjectInvoiceService(
            IRepository<Project> projectRepo,
            IRepository<ProjectInvoice> invoiceRepo,
            IRepository<ProjectInvoiceDocument> documentRepo,
            IRepository<ProjectMilestone> milestoneRepo,
            IRepository<ProjectResourceManager> projectResourceManagerRepo,
            IRepository<Client> clientRepo,
            IProjectInvoiceStorageService storage,
            IClientAccessService clientAccess)
        {
            _projectRepo = projectRepo;
            _invoiceRepo = invoiceRepo;
            _documentRepo = documentRepo;
            _milestoneRepo = milestoneRepo;
            _projectResourceManagerRepo = projectResourceManagerRepo;
            _clientRepo = clientRepo;
            _storage = storage;
            _clientAccess = clientAccess;
        }

        public async Task<List<ProjectInvoiceDto>> GetInvoicesForProjectAsync(int userId, string role, int projectId)
        {
            await EnsureCanViewProjectAsync(userId, role, projectId);

            var invoices = await _invoiceRepo
                .Query()
                .AsNoTracking()
                .Include(i => i.Milestone)
                .Include(i => i.Documents)
                .Where(i => i.ProjectId == projectId)
                .OrderByDescending(i => i.BillingYear)
                .ThenByDescending(i => i.BillingMonth)
                .ThenByDescending(i => i.Milestone != null ? i.Milestone.Order : 0)
                .ThenByDescending(i => i.Id)
                .ToListAsync();

            return invoices.Select(MapInvoice).ToList();
        }

        public async Task<ProjectInvoiceDto> UpsertMilestoneInvoiceAsync(
            int projectId,
            int milestoneId,
            IReadOnlyList<(Stream Content, string FileName)> invoiceFiles,
            Stream? purchaseOrderContent,
            string? purchaseOrderFileName,
            string? notes)
        {
            var project = await GetProjectOrThrowAsync(projectId);
            EnsureMilestoneInvoiceProject(project);

            var milestone = await _milestoneRepo
                .Query()
                .FirstOrDefaultAsync(m => m.Id == milestoneId && m.ProjectId == projectId && !m.IsDeleted)
                ?? throw new AppException("Milestone not found.", 404);

            var existing = await _invoiceRepo
                .Query()
                .Include(i => i.Documents)
                .FirstOrDefaultAsync(i => i.ProjectId == projectId && i.MilestoneId == milestoneId);

            return await UpsertInvoiceFilesAsync(
                existing,
                projectId,
                create: () => new ProjectInvoice
                {
                    ProjectId = projectId,
                    MilestoneId = milestoneId,
                    Amount = milestone.PaymentAmount,
                    PaymentStatus = PaymentStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                },
                invoiceFiles,
                purchaseOrderContent,
                purchaseOrderFileName,
                notes,
                defaultAmount: milestone.PaymentAmount);
        }

        public async Task<ProjectInvoiceDto> UpsertMonthlyInvoiceAsync(
            int projectId,
            int billingYear,
            int billingMonth,
            IReadOnlyList<(Stream Content, string FileName)> invoiceFiles,
            Stream? purchaseOrderContent,
            string? purchaseOrderFileName,
            string? notes)
        {
            var project = await GetProjectOrThrowAsync(projectId);
            if (project.BudgetType != ProjectBudgetType.Hourly)
                throw new AppException("Monthly invoices apply only to hourly projects.", 400);

            if (billingYear < 2000 || billingYear > 2100 || billingMonth is < 1 or > 12)
                throw new AppException("Invalid billing period.", 400);

            var existing = await _invoiceRepo
                .Query()
                .Include(i => i.Documents)
                .FirstOrDefaultAsync(i =>
                    i.ProjectId == projectId
                    && i.BillingYear == billingYear
                    && i.BillingMonth == billingMonth);

            return await UpsertInvoiceFilesAsync(
                existing,
                projectId,
                create: () => new ProjectInvoice
                {
                    ProjectId = projectId,
                    BillingYear = billingYear,
                    BillingMonth = billingMonth,
                    PaymentStatus = PaymentStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                },
                invoiceFiles,
                purchaseOrderContent,
                purchaseOrderFileName,
                notes,
                defaultAmount: null);
        }

        public async Task<ProjectInvoiceDto> UpsertWholeInvoiceAsync(
            int projectId,
            IReadOnlyList<(Stream Content, string FileName)> invoiceFiles,
            Stream? purchaseOrderContent,
            string? purchaseOrderFileName,
            string? notes)
        {
            var project = await GetProjectOrThrowAsync(projectId);
            if (project.BudgetType != ProjectBudgetType.Total || project.UsesMilestones)
                throw new AppException("Whole-project invoices apply only to fixed budget projects without milestones.", 400);

            var existing = await _invoiceRepo
                .Query()
                .Include(i => i.Documents)
                .FirstOrDefaultAsync(i =>
                    i.ProjectId == projectId
                    && i.MilestoneId == null
                    && i.BillingYear == null
                    && i.BillingMonth == null);

            return await UpsertInvoiceFilesAsync(
                existing,
                projectId,
                create: () => new ProjectInvoice
                {
                    ProjectId = projectId,
                    Amount = project.Budget,
                    PaymentStatus = PaymentStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                },
                invoiceFiles,
                purchaseOrderContent,
                purchaseOrderFileName,
                notes,
                defaultAmount: project.Budget);
        }

        public async Task<ProjectInvoiceDto> AddDocumentsAsync(
            int projectId,
            int invoiceId,
            IReadOnlyList<(Stream Content, string FileName)> invoiceFiles)
        {
            if (invoiceFiles.Count == 0)
                throw new AppException("At least one invoice document is required.", 400);

            var invoice = await _invoiceRepo
                .Query()
                .Include(i => i.Milestone)
                .Include(i => i.Documents)
                .FirstOrDefaultAsync(i => i.Id == invoiceId && i.ProjectId == projectId)
                ?? throw new AppException("Invoice not found.", 404);

            await AppendDocumentsAsync(invoice, projectId, invoiceFiles);
            invoice.UpdatedAt = DateTime.UtcNow;
            await _invoiceRepo.SaveChangesAsync();
            return MapInvoice(invoice);
        }

        public async Task DeleteDocumentAsync(int projectId, int invoiceId, int documentId)
        {
            var invoice = await _invoiceRepo
                .Query()
                .Include(i => i.Documents)
                .FirstOrDefaultAsync(i => i.Id == invoiceId && i.ProjectId == projectId)
                ?? throw new AppException("Invoice not found.", 404);

            var document = invoice.Documents.FirstOrDefault(d => d.Id == documentId && !d.IsDeleted)
                ?? throw new AppException("Document not found.", 404);

            var remaining = invoice.Documents.Count(d => !d.IsDeleted && d.Id != documentId);
            if (remaining == 0)
                throw new AppException("Cannot delete the last invoice document. Delete the payment record instead.", 400);

            document.IsDeleted = true;
            document.DeletedAt = DateTime.UtcNow;
            document.UpdatedAt = DateTime.UtcNow;
            _documentRepo.SaveInclude(
                document,
                nameof(document.IsDeleted),
                nameof(document.DeletedAt),
                nameof(document.UpdatedAt));

            SyncPrimaryInvoiceFile(invoice);
            invoice.UpdatedAt = DateTime.UtcNow;
            await _invoiceRepo.SaveChangesAsync();

            TryDeleteStoredFromUrl(document.FileUrl);
        }

        public async Task<ProjectInvoiceDto> AttachPurchaseOrderAsync(
            int projectId,
            int invoiceId,
            Stream purchaseOrderContent,
            string purchaseOrderFileName)
        {
            ValidateInvoiceFileName(purchaseOrderFileName);

            var invoice = await _invoiceRepo
                .Query()
                .Include(i => i.Milestone)
                .Include(i => i.Documents)
                .FirstOrDefaultAsync(i => i.Id == invoiceId && i.ProjectId == projectId)
                ?? throw new AppException("Invoice not found. Upload an invoice first.", 404);

            var storedPo = await _storage.SaveAsync(projectId, "po", purchaseOrderFileName, purchaseOrderContent);
            var oldPoUrl = invoice.PurchaseOrderFileUrl;

            invoice.PurchaseOrderFileName = Path.GetFileName(purchaseOrderFileName);
            invoice.PurchaseOrderFileUrl = _storage.GetPublicUrl(storedPo);
            invoice.UpdatedAt = DateTime.UtcNow;

            _invoiceRepo.SaveInclude(
                invoice,
                nameof(invoice.PurchaseOrderFileName),
                nameof(invoice.PurchaseOrderFileUrl),
                nameof(invoice.UpdatedAt));
            await _invoiceRepo.SaveChangesAsync();

            TryDeleteStoredFromUrl(oldPoUrl);
            return MapInvoice(invoice);
        }

        public async Task<ProjectInvoiceDto> UpdatePaymentStatusAsync(int projectId, int invoiceId, PaymentStatus status)
        {
            if (status is not (PaymentStatus.Pending or PaymentStatus.Completed))
                throw new AppException("Invalid payment status.", 400);

            var invoice = await _invoiceRepo
                .Query()
                .Include(i => i.Milestone)
                .Include(i => i.Documents)
                .FirstOrDefaultAsync(i => i.Id == invoiceId && i.ProjectId == projectId)
                ?? throw new AppException("Invoice not found.", 404);

            invoice.PaymentStatus = status;
            invoice.UpdatedAt = DateTime.UtcNow;
            _invoiceRepo.SaveInclude(invoice, nameof(invoice.PaymentStatus), nameof(invoice.UpdatedAt));
            await _invoiceRepo.SaveChangesAsync();

            return MapInvoice(invoice);
        }

        public async Task DeleteInvoiceAsync(int projectId, int invoiceId)
        {
            var invoice = await _invoiceRepo
                .Query()
                .Include(i => i.Documents)
                .FirstOrDefaultAsync(i => i.Id == invoiceId && i.ProjectId == projectId)
                ?? throw new AppException("Invoice not found.", 404);

            var now = DateTime.UtcNow;
            invoice.IsDeleted = true;
            invoice.DeletedAt = now;
            invoice.UpdatedAt = now;
            _invoiceRepo.SaveInclude(
                invoice,
                nameof(invoice.IsDeleted),
                nameof(invoice.DeletedAt),
                nameof(invoice.UpdatedAt));

            foreach (var doc in invoice.Documents.Where(d => !d.IsDeleted))
            {
                doc.IsDeleted = true;
                doc.DeletedAt = now;
                doc.UpdatedAt = now;
            }

            await _invoiceRepo.SaveChangesAsync();
        }

        private async Task<ProjectInvoiceDto> UpsertInvoiceFilesAsync(
            ProjectInvoice? existing,
            int projectId,
            Func<ProjectInvoice> create,
            IReadOnlyList<(Stream Content, string FileName)> invoiceFiles,
            Stream? purchaseOrderContent,
            string? purchaseOrderFileName,
            string? notes,
            decimal? defaultAmount)
        {
            if (invoiceFiles.Count == 0)
                throw new AppException("At least one invoice document is required.", 400);

            string? storedPo = null;
            if (purchaseOrderContent is not null && !string.IsNullOrWhiteSpace(purchaseOrderFileName))
            {
                ValidateInvoiceFileName(purchaseOrderFileName);
                storedPo = await _storage.SaveAsync(projectId, "po", purchaseOrderFileName, purchaseOrderContent);
            }

            if (existing is null)
            {
                var invoice = create();
                if (notes is not null)
                    invoice.Notes = notes.Trim();
                if (!invoice.Amount.HasValue)
                    invoice.Amount = defaultAmount;

                if (storedPo is not null)
                {
                    invoice.PurchaseOrderFileName = Path.GetFileName(purchaseOrderFileName!);
                    invoice.PurchaseOrderFileUrl = _storage.GetPublicUrl(storedPo);
                }

                // Placeholder until first document is attached (required columns).
                invoice.InvoiceFileName = Path.GetFileName(invoiceFiles[0].FileName);
                invoice.InvoiceFileUrl = string.Empty;

                await _invoiceRepo.AddAsync(invoice);
                await _invoiceRepo.SaveChangesAsync();

                await AppendDocumentsAsync(invoice, projectId, invoiceFiles);
                await _invoiceRepo.SaveChangesAsync();

                if (invoice.MilestoneId.HasValue)
                    invoice.Milestone = await _milestoneRepo.GetByIDAsync(invoice.MilestoneId.Value);

                return MapInvoice(invoice);
            }

            await AppendDocumentsAsync(existing, projectId, invoiceFiles);

            var oldPoUrl = existing.PurchaseOrderFileUrl;
            if (storedPo is not null)
            {
                existing.PurchaseOrderFileName = Path.GetFileName(purchaseOrderFileName!);
                existing.PurchaseOrderFileUrl = _storage.GetPublicUrl(storedPo);
            }

            if (notes is not null)
                existing.Notes = notes.Trim();
            if (!existing.Amount.HasValue && defaultAmount.HasValue)
                existing.Amount = defaultAmount;

            existing.UpdatedAt = DateTime.UtcNow;
            await _invoiceRepo.SaveChangesAsync();

            if (storedPo is not null)
                TryDeleteStoredFromUrl(oldPoUrl);

            if (existing.Milestone is null && existing.MilestoneId.HasValue)
                existing.Milestone = await _milestoneRepo.GetByIDAsync(existing.MilestoneId.Value);

            return MapInvoice(existing);
        }

        private async Task AppendDocumentsAsync(
            ProjectInvoice invoice,
            int projectId,
            IReadOnlyList<(Stream Content, string FileName)> invoiceFiles)
        {
            var nextOrder = invoice.Documents
                .Where(d => !d.IsDeleted)
                .Select(d => d.DisplayOrder)
                .DefaultIfEmpty(0)
                .Max();

            foreach (var (content, fileName) in invoiceFiles)
            {
                ValidateInvoiceFileName(fileName);
                var stored = await _storage.SaveAsync(projectId, "invoice", fileName, content);
                nextOrder++;

                var doc = new ProjectInvoiceDocument
                {
                    ProjectInvoiceId = invoice.Id,
                    FileName = Path.GetFileName(fileName),
                    FileUrl = _storage.GetPublicUrl(stored),
                    DisplayOrder = nextOrder,
                    CreatedAt = DateTime.UtcNow
                };

                invoice.Documents.Add(doc);
            }

            SyncPrimaryInvoiceFile(invoice);
        }

        private static void SyncPrimaryInvoiceFile(ProjectInvoice invoice)
        {
            var first = invoice.Documents
                .Where(d => !d.IsDeleted)
                .OrderBy(d => d.DisplayOrder)
                .ThenBy(d => d.Id)
                .FirstOrDefault();

            if (first is null)
                return;

            invoice.InvoiceFileName = first.FileName;
            invoice.InvoiceFileUrl = first.FileUrl;
        }

        private void TryDeleteStoredFromUrl(string? publicUrl)
        {
            if (string.IsNullOrWhiteSpace(publicUrl))
                return;

            var fileName = Path.GetFileName(publicUrl);
            _storage.TryDelete(fileName);
        }

        private async Task EnsureCanViewProjectAsync(int userId, string role, int projectId)
        {
            var project = await GetProjectOrThrowAsync(projectId);

            if (string.Equals(role, nameof(UserRole.Administrator), StringComparison.OrdinalIgnoreCase))
                return;

            if (string.Equals(role, nameof(UserRole.Client), StringComparison.OrdinalIgnoreCase))
            {
                var projectClientId = project.ClientId
                    ?? (await _projectRepo
                        .Query()
                        .Include(p => p.ServiceRequest)
                        .Where(p => p.Id == projectId)
                        .Select(p => p.ServiceRequest != null ? (int?)p.ServiceRequest.ClientId : null)
                        .FirstOrDefaultAsync());

                if (!projectClientId.HasValue
                    || !await _clientAccess.CanAccessClientIdAsync(userId, projectClientId.Value))
                    throw new AppException("You do not have access to this project.", 403);

                return;
            }

            if (string.Equals(role, nameof(UserRole.ResourceManager), StringComparison.OrdinalIgnoreCase))
            {
                var assigned = await _projectResourceManagerRepo
                    .Query()
                    .AnyAsync(r =>
                        r.ProjectId == projectId
                        && r.ResourceManagerUserId == userId
                        && r.IsActive
                        && !r.IsDeleted);

                if (!assigned)
                    throw new AppException("You do not have access to this project.", 403);

                return;
            }

            throw new AppException("You do not have access to this project.", 403);
        }

        private async Task<Project> GetProjectOrThrowAsync(int projectId)
        {
            var project = await _projectRepo.GetByIDAsync(projectId);
            if (project is null || project.IsDeleted)
                throw new AppException("Project not found.", 404);
            return project;
        }

        private static void EnsureMilestoneInvoiceProject(Project project)
        {
            if (project.BudgetType != ProjectBudgetType.Total || !project.UsesMilestones)
                throw new AppException("Milestone invoices apply only to fixed budget projects with milestones.", 400);
        }

        private static void ValidateInvoiceFileName(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName))
                throw new AppException("Invoice file is required.", 400);

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            if (ext is not (".pdf" or ".png" or ".jpg" or ".jpeg" or ".doc" or ".docx"))
                throw new AppException("Unsupported file type. Use PDF, image, or Word documents.", 400);
        }

        private static ProjectInvoiceDto MapInvoice(ProjectInvoice invoice)
        {
            var documents = invoice.Documents
                .Where(d => !d.IsDeleted)
                .OrderByDescending(d => d.DisplayOrder)
                .ThenByDescending(d => d.Id)
                .Select(d => new ProjectInvoiceDocumentDto
                {
                    Id = d.Id,
                    FileName = d.FileName,
                    FileUrl = d.FileUrl,
                    DisplayOrder = d.DisplayOrder
                })
                .ToList();

            // Back-compat: if documents table is empty but legacy columns exist, expose as one doc.
            if (documents.Count == 0
                && !string.IsNullOrWhiteSpace(invoice.InvoiceFileUrl)
                && !string.IsNullOrWhiteSpace(invoice.InvoiceFileName))
            {
                documents.Add(new ProjectInvoiceDocumentDto
                {
                    Id = 0,
                    FileName = invoice.InvoiceFileName,
                    FileUrl = invoice.InvoiceFileUrl,
                    DisplayOrder = 1
                });
            }

            var primary = documents.FirstOrDefault();

            return new ProjectInvoiceDto
            {
                Id = invoice.Id,
                ProjectId = invoice.ProjectId,
                MilestoneId = invoice.MilestoneId,
                MilestoneName = invoice.Milestone?.Name,
                BillingYear = invoice.BillingYear,
                BillingMonth = invoice.BillingMonth,
                InvoiceFileName = primary?.FileName ?? invoice.InvoiceFileName,
                InvoiceFileUrl = primary?.FileUrl ?? invoice.InvoiceFileUrl,
                Documents = documents,
                PurchaseOrderFileName = invoice.PurchaseOrderFileName,
                PurchaseOrderFileUrl = invoice.PurchaseOrderFileUrl,
                PaymentStatus = invoice.PaymentStatus,
                Amount = invoice.Amount,
                Notes = invoice.Notes
            };
        }
    }
}
