using Microsoft.Extensions.Configuration;
using OffsureManagementSystem.Application.Interfaces.Services;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ProjectInvoiceStorageService : IProjectInvoiceStorageService
    {
        private const string RootConfigKey = "Storage:ProjectInvoiceRoot";
        private const string PublicBasePath = "/storage/project-invoices";

        private readonly string _rootPath;

        public ProjectInvoiceStorageService(IConfiguration configuration)
        {
            _rootPath = configuration[RootConfigKey]
                ?? throw new InvalidOperationException(
                    $"Missing configuration key '{RootConfigKey}'. Ensure LocalStorageBootstrap runs at startup.");
        }

        public async Task<string> SaveAsync(int projectId, string kind, string fileName, Stream content)
        {
            Directory.CreateDirectory(_rootPath);

            var extension = Path.GetExtension(fileName);
            if (string.IsNullOrWhiteSpace(extension))
                extension = ".pdf";

            var safeKind = string.IsNullOrWhiteSpace(kind) ? "doc" : kind.Trim().ToLowerInvariant();
            var storedName = $"{projectId}-{safeKind}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var path = Path.Combine(_rootPath, storedName);

            await using var output = File.Create(path);
            await content.CopyToAsync(output);

            return storedName;
        }

        public string GetPublicUrl(string storedFileName)
        {
            if (string.IsNullOrWhiteSpace(storedFileName))
                return string.Empty;

            return $"{PublicBasePath}/{Path.GetFileName(storedFileName.Trim())}";
        }

        public void TryDelete(string? storedFileName)
        {
            if (string.IsNullOrWhiteSpace(storedFileName))
                return;

            var path = Path.Combine(_rootPath, Path.GetFileName(storedFileName.Trim()));
            if (File.Exists(path))
                File.Delete(path);
        }
    }
}