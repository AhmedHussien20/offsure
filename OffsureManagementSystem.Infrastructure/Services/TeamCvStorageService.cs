using Microsoft.Extensions.Configuration;
using OffsureManagementSystem.Application.Interfaces.Services;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class TeamCvStorageService : ITeamCvStorageService
    {
        private readonly string _rootPath;
        private const string PublicBasePath = "/storage/team-cvs";

        public TeamCvStorageService(IConfiguration configuration)
        {
            _rootPath = configuration[TeamCvRootConfigKey]
                ?? throw new InvalidOperationException(
                    $"Missing configuration key '{TeamCvRootConfigKey}'. Ensure LocalStorageBootstrap runs at startup.");
        }

        private const string TeamCvRootConfigKey = "Storage:TeamCvRoot";

        public async Task<string> SaveUploadedCvAsync(int teamMemberId, string fileName, Stream content)
        {
            Directory.CreateDirectory(_rootPath);

            var extension = Path.GetExtension(fileName);
            if (string.IsNullOrWhiteSpace(extension))
                extension = ".pdf";

            var safeName = $"{teamMemberId}-uploaded-cv{extension.ToLowerInvariant()}";
            var path = Path.Combine(_rootPath, safeName);

            await using var output = File.Create(path);
            await content.CopyToAsync(output);

            return safeName;
        }

        public string GetCvPublicUrl(string storedPath)
        {
            var fileName = GetCvFileName(storedPath);
            return string.IsNullOrWhiteSpace(fileName) ? string.Empty : $"{PublicBasePath}/{fileName}";
        }

        public string GetCvFileName(string storedPath)
        {
            if (string.IsNullOrWhiteSpace(storedPath))
                return string.Empty;

            return Path.GetFileName(storedPath.Trim());
        }

        public (Stream Stream, string FileName, string ContentType)? OpenCvRead(string storedPath)
        {
            if (string.IsNullOrWhiteSpace(storedPath))
                return null;

            var fileName = GetCvFileName(storedPath);
            var path = Path.IsPathRooted(storedPath)
                ? storedPath
                : Path.Combine(_rootPath, fileName);

            if (!File.Exists(path))
                return null;

            var stream = File.OpenRead(path);
            return (stream, fileName, ResolveContentType(fileName));
        }

        private static string ResolveContentType(string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension switch
            {
                ".pdf" => "application/pdf",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".txt" => "text/plain",
                _ => "application/octet-stream"
            };
        }
    }
}
