using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.ProjectInvoiceDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using System.Security.Claims;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/projects/{projectId:int}/invoices")]
    [ApiController]
    [Authorize]
    public class ProjectInvoicesController : BaseController
    {
        private readonly IProjectInvoiceService _invoiceService;

        public ProjectInvoicesController(IProjectInvoiceService invoiceService)
        {
            _invoiceService = invoiceService;
        }

        [HttpGet]
        [Authorize(Roles = "Administrator,Client,ResourceManager")]
        public async Task<ActionResult<ApiResponse<List<ProjectInvoiceDto>>>> GetAll(int projectId)
        {
            var invoices = await _invoiceService.GetInvoicesForProjectAsync(
                GetCurrentUserId(),
                GetCurrentRole(),
                projectId);
            return Ok(ApiResponse<List<ProjectInvoiceDto>>.Ok(invoices));
        }

        [HttpPost("milestone/{milestoneId:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectInvoiceDto>>> UpsertMilestone(
            int projectId,
            int milestoneId,
            [FromForm] List<IFormFile>? invoices,
            IFormFile? invoice,
            IFormFile? purchaseOrder,
            [FromForm] string? notes)
        {
            var files = CollectInvoiceFiles(invoices, invoice);
            if (files.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            var opened = OpenFiles(files);
            Stream? poStream = null;
            if (purchaseOrder is { Length: > 0 })
                poStream = purchaseOrder.OpenReadStream();

            try
            {
                var result = await _invoiceService.UpsertMilestoneInvoiceAsync(
                    projectId,
                    milestoneId,
                    opened,
                    poStream,
                    purchaseOrder?.FileName,
                    notes);
                return Ok(ApiResponse<ProjectInvoiceDto>.Ok(result, "Invoice documentation saved."));
            }
            finally
            {
                await DisposeStreamsAsync(opened, poStream);
            }
        }

        [HttpPost("monthly")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectInvoiceDto>>> UpsertMonthly(
            int projectId,
            [FromForm] int billingYear,
            [FromForm] int billingMonth,
            [FromForm] List<IFormFile>? invoices,
            IFormFile? invoice,
            IFormFile? purchaseOrder,
            [FromForm] string? notes)
        {
            var files = CollectInvoiceFiles(invoices, invoice);
            if (files.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            var opened = OpenFiles(files);
            Stream? poStream = null;
            if (purchaseOrder is { Length: > 0 })
                poStream = purchaseOrder.OpenReadStream();

            try
            {
                var result = await _invoiceService.UpsertMonthlyInvoiceAsync(
                    projectId,
                    billingYear,
                    billingMonth,
                    opened,
                    poStream,
                    purchaseOrder?.FileName,
                    notes);
                return Ok(ApiResponse<ProjectInvoiceDto>.Ok(result, "Invoice documentation saved."));
            }
            finally
            {
                await DisposeStreamsAsync(opened, poStream);
            }
        }

        [HttpPost("whole")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectInvoiceDto>>> UpsertWhole(
            int projectId,
            [FromForm] List<IFormFile>? invoices,
            IFormFile? invoice,
            IFormFile? purchaseOrder,
            [FromForm] string? notes)
        {
            var files = CollectInvoiceFiles(invoices, invoice);
            if (files.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            var opened = OpenFiles(files);
            Stream? poStream = null;
            if (purchaseOrder is { Length: > 0 })
                poStream = purchaseOrder.OpenReadStream();

            try
            {
                var result = await _invoiceService.UpsertWholeInvoiceAsync(
                    projectId,
                    opened,
                    poStream,
                    purchaseOrder?.FileName,
                    notes);
                return Ok(ApiResponse<ProjectInvoiceDto>.Ok(result, "Invoice documentation saved."));
            }
            finally
            {
                await DisposeStreamsAsync(opened, poStream);
            }
        }

        [HttpPost("{invoiceId:int}/documents")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectInvoiceDto>>> AddDocuments(
            int projectId,
            int invoiceId,
            [FromForm] List<IFormFile>? invoices,
            IFormFile? invoice)
        {
            var files = CollectInvoiceFiles(invoices, invoice);
            if (files.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            var opened = OpenFiles(files);
            try
            {
                var result = await _invoiceService.AddDocumentsAsync(projectId, invoiceId, opened);
                return Ok(ApiResponse<ProjectInvoiceDto>.Ok(result, "Invoice documentation added."));
            }
            finally
            {
                await DisposeStreamsAsync(opened, null);
            }
        }

        [HttpDelete("{invoiceId:int}/documents/{documentId:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteDocument(
            int projectId,
            int invoiceId,
            int documentId)
        {
            await _invoiceService.DeleteDocumentAsync(projectId, invoiceId, documentId);
            return Ok(ApiResponse<object>.Ok(null!, "Document deleted."));
        }

        [HttpPost("{invoiceId:int}/purchase-order")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectInvoiceDto>>> AttachPurchaseOrder(
            int projectId,
            int invoiceId,
            IFormFile purchaseOrder)
        {
            if (purchaseOrder is null || purchaseOrder.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            await using var stream = purchaseOrder.OpenReadStream();
            var result = await _invoiceService.AttachPurchaseOrderAsync(
                projectId,
                invoiceId,
                stream,
                purchaseOrder.FileName);
            return Ok(ApiResponse<ProjectInvoiceDto>.Ok(result, "Purchase order saved."));
        }

        [HttpPatch("{invoiceId:int}/status")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<ProjectInvoiceDto>>> UpdateStatus(
            int projectId,
            int invoiceId,
            [FromBody] UpdateProjectInvoiceStatusDto dto)
        {
            var result = await _invoiceService.UpdatePaymentStatusAsync(projectId, invoiceId, dto.Status);
            return Ok(ApiResponse<ProjectInvoiceDto>.Ok(result, "Payment status updated."));
        }

        [HttpDelete("{invoiceId:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int projectId, int invoiceId)
        {
            await _invoiceService.DeleteInvoiceAsync(projectId, invoiceId);
            return Ok(ApiResponse<object>.Ok(null!, "Invoice deleted."));
        }

        private static List<IFormFile> CollectInvoiceFiles(List<IFormFile>? invoices, IFormFile? invoice)
        {
            // Prefer the multi-file field; fall back to legacy single "invoice".
            // Deduplicate by name+size so the same file is never stored twice.
            var source = invoices is { Count: > 0 }
                ? invoices.Where(f => f is { Length: > 0 })
                : invoice is { Length: > 0 }
                    ? new[] { invoice }
                    : Array.Empty<IFormFile>();

            return source
                .GroupBy(f => $"{f.FileName}|{f.Length}", StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .ToList();
        }

        private static List<(Stream Content, string FileName)> OpenFiles(IEnumerable<IFormFile> files)
            => files.Select(f => ((Stream)f.OpenReadStream(), f.FileName)).ToList();

        private static async Task DisposeStreamsAsync(
            IEnumerable<(Stream Content, string FileName)> opened,
            Stream? poStream)
        {
            foreach (var (content, _) in opened)
                await content.DisposeAsync();
            if (poStream is not null)
                await poStream.DisposeAsync();
        }

        private int GetCurrentUserId()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
                throw new UnauthorizedAccessException("Invalid user token.");
            return userId;
        }

        private string GetCurrentRole()
            => User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
    }
}
